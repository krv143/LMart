const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
const { CosmosClient } = require("@azure/cosmos");
const { DefaultAzureCredential } = require("@azure/identity");

const isAzureAppService = Boolean(process.env.WEBSITE_SITE_NAME);
const dataDir = isAzureAppService
  ? path.join(process.env.HOME || process.cwd(), "data", "handyman-push-api")
  : path.resolve(__dirname, "../data");
const installsFile = path.join(dataDir, "installs.json");
const loginActivityFile = path.join(dataDir, "login-activity.json");
const sendLogsFile = path.join(dataDir, "send-logs.json");
const activityEventsFile = path.join(dataDir, "activity-events.json");
const profileMessagesFile = path.join(dataDir, "profile-messages.json");
const helpRequestsFile = path.join(dataDir, "help-requests.json");

const app = express();
const port = process.env.PORT || 8080;
const defaultOrigin =
  process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*";
const allowedOrigins = String(defaultOrigin)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const corsOrigin =
  allowedOrigins.length === 0 || allowedOrigins.includes("*")
    ? true
    : allowedOrigins;

app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const ensureDataFile = async (filePath) => {
  try {
    await fs.access(filePath);
  } catch {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, "[]\n", "utf8");
  }
};

const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readJsonArray = async (filePath) => {
  await ensureDataFile(filePath);
  const raw = await fs.readFile(filePath, "utf8");
  const normalizedRaw = raw.trim();

  if (!normalizedRaw) {
    return [];
  }

  try {
    const parsed = JSON.parse(normalizedRaw);
    if (!Array.isArray(parsed)) {
      console.warn(`Expected array JSON in ${filePath}; received ${typeof parsed}. Returning empty array.`);
      return [];
    }

    return parsed.filter((record) => {
      if (isPlainObject(record)) {
        return true;
      }

      console.warn(`Ignoring malformed record in ${filePath}.`);
      return false;
    });
  } catch (error) {
    console.error(`Failed to parse JSON from ${filePath}. Returning empty array.`, error);
    return [];
  }
};

const writeJsonArray = async (filePath, records) => {
  await fs.writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
};

const nowIso = () => new Date().toISOString();

const asTrimmedString = (value) => String(value || "").trim();

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) {
      continue;
    }
    const normalized = asTrimmedString(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
};

const parseDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const cosmosEndpoint =
  process.env.COSMOS_ENDPOINT || "https://handymanlivedb.documents.azure.com:443/";
const cosmosKey = asTrimmedString(process.env.COSMOS_KEY);
const cosmosUseManagedIdentity =
  asTrimmedString(process.env.COSMOS_USE_MANAGED_IDENTITY).toLowerCase() === "true" ||
  (!cosmosKey && isAzureAppService);
const cosmosDatabaseId = process.env.COSMOS_DATABASE || "LMartdb";
const cosmosContainerId = process.env.COSMOS_CONTAINER || "LMartprd";
const cosmosAadScope = process.env.COSMOS_AAD_SCOPE || "https://cosmos.azure.com/.default";
let martOrdersContainerPromise = null;
let cosmosCredential = null;

const normalizePhoneNumber = (value) => {
  const digits = String(value || "").replace(/\D+/g, "");
  if (!digits) {
    return "";
  }
  return digits.length > 10 ? digits.slice(-10) : digits;
};

const isDraftOrderStatus = (value) => asTrimmedString(value).toLowerCase() === "draft";

const hasConfiguredMartOrdersStore = () =>
  Boolean(
    cosmosEndpoint &&
      cosmosDatabaseId &&
      cosmosContainerId &&
      (cosmosKey || cosmosUseManagedIdentity)
  );

const getCosmosClient = () => {
  if (cosmosKey) {
    return new CosmosClient({
      endpoint: cosmosEndpoint,
      key: cosmosKey,
    });
  }

  if (!cosmosUseManagedIdentity) {
    throw new Error("Cosmos DB credentials are not configured.");
  }

  if (!cosmosCredential) {
    cosmosCredential = new DefaultAzureCredential();
  }

  return new CosmosClient({
    endpoint: cosmosEndpoint,
    aadCredentials: cosmosCredential,
    aadScope: cosmosAadScope,
  });
};

const profileActiveTtlMs = Math.max(
  60 * 1000,
  asNumber(process.env.PROFILE_ACTIVE_TTL_MS, 15 * 60 * 1000)
);
const recentEventLimit = 10;

const filterByIdentity = (records, filters = {}) => {
  const requested = [
    filters.userId,
    filters.installId,
    filters.mobileNumber,
    filters.recipientId,
  ]
    .map(asTrimmedString)
    .filter(Boolean);

  if (!requested.length) {
    return records;
  }

  return records.filter((record) => {
    const candidates = [
      pickFirst(record.userId, record.UserId),
      pickFirst(record.installId, record.deviceId),
      pickFirst(record.mobileNumber, record.phoneNumber, record.phone),
      pickFirst(record.recipientId, record.id),
    ].filter(Boolean);

    return requested.some((value) => candidates.includes(value));
  });
};

const resolveSummaryKey = (record, index) =>
  pickFirst(
    record.userId,
    record.UserId,
    record.mobileNumber,
    record.phoneNumber,
    record.installId,
    record.deviceId,
    record.recipientId,
    record.id
  ) || `summary-${index}`;

const isPushEnabled = (record) => {
  const candidates = [
    record.pushEnabled,
    record.isPushEnabled,
    record.notificationsEnabled,
    record.permissionGranted,
    record.hasSubscription,
    record.pushSubscription,
  ];
  return candidates.some(
    (value) => value === true || value === "true" || value === "granted"
  );
};

const normalizeInstallRecord = (payload, existingRecord = null) => {
  const timestamp = nowIso();
  const installId = pickFirst(payload.installId, existingRecord?.installId) || crypto.randomUUID();
  const userId = pickFirst(payload.userId, payload.UserId, existingRecord?.userId, installId);
  const subscription = payload.pushSubscription && typeof payload.pushSubscription === "object"
    ? payload.pushSubscription
    : existingRecord?.pushSubscription || null;
  const lastSeenAt = pickFirst(payload.lastSeenAt, payload.seenAt, payload.updatedAt, timestamp);

  return {
    installId,
    userId,
    name: pickFirst(payload.name, payload.fullName, payload.userName, existingRecord?.name) || "Unknown user",
    fullName: pickFirst(payload.fullName, existingRecord?.fullName),
    mobileNumber: pickFirst(payload.mobileNumber, payload.phoneNumber, payload.phone, existingRecord?.mobileNumber),
    device: pickFirst(payload.device, payload.deviceType, payload.platform, existingRecord?.device),
    browser: pickFirst(payload.browser, existingRecord?.browser),
    location: pickFirst(payload.location, payload.city, payload.district, existingRecord?.location),
    district: pickFirst(payload.district, existingRecord?.district),
    city: pickFirst(payload.city, existingRecord?.city),
    state: pickFirst(payload.state, existingRecord?.state),
    permissionGranted: pickFirst(payload.permissionGranted, existingRecord?.permissionGranted) || (isPushEnabled(payload) ? "granted" : "default"),
    pushEnabled: isPushEnabled(payload) || Boolean(subscription) || existingRecord?.pushEnabled || false,
    notificationsEnabled: isPushEnabled(payload) || Boolean(subscription) || existingRecord?.notificationsEnabled || false,
    hasSubscription: Boolean(subscription) || existingRecord?.hasSubscription || false,
    pushSubscription: subscription,
    tags: Array.isArray(payload.tags) ? payload.tags.filter(Boolean) : existingRecord?.tags || [],
    source: payload.source && typeof payload.source === "object" ? payload.source : existingRecord?.source || null,
    firstSeenAt: existingRecord?.firstSeenAt || pickFirst(payload.firstSeenAt, payload.createdAt, timestamp),
    lastSeenAt,
    createdAt: existingRecord?.createdAt || timestamp,
    updatedAt: timestamp,
  };
};

const normalizeLoginActivity = (payload) => {
  const createdAt = nowIso();
  return {
    id: crypto.randomUUID(),
    userId: pickFirst(payload.userId, payload.UserId, payload.installId) || "unknown-user",
    installId: pickFirst(payload.installId, payload.deviceId),
    mobileNumber: pickFirst(payload.mobileNumber, payload.phoneNumber, payload.phone),
    name: pickFirst(payload.name, payload.fullName, payload.userName),
    eventType: pickFirst(payload.eventType, payload.type) || "login",
    loginAt: pickFirst(payload.loginAt, payload.createdAt, createdAt),
    device: pickFirst(payload.device, payload.deviceType, payload.platform),
    browser: pickFirst(payload.browser),
    location: pickFirst(payload.location, payload.city, payload.district),
    ipAddress: pickFirst(payload.ipAddress),
    permissionGranted: pickFirst(payload.permissionGranted) || "default",
    pushEnabled: isPushEnabled(payload),
    notificationsEnabled: isPushEnabled(payload),
    hasSubscription: isPushEnabled(payload),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    createdAt,
  };
};

const normalizeActivityEvent = (payload) => {
  const createdAt = nowIso();
  const durationSeconds = asNumber(payload.durationSeconds);
  const activeSeconds = asNumber(payload.activeSeconds, durationSeconds);

  return {
    id: crypto.randomUUID(),
    userId: pickFirst(payload.userId, payload.UserId, payload.installId) || "unknown-user",
    installId: pickFirst(payload.installId, payload.deviceId),
    mobileNumber: pickFirst(payload.mobileNumber, payload.phoneNumber, payload.phone),
    name: pickFirst(payload.name, payload.fullName, payload.userName),
    eventType: pickFirst(payload.eventType, payload.type) || "activity",
    action: pickFirst(payload.action, payload.activity, payload.label),
    sessionId: pickFirst(payload.sessionId),
    page: pickFirst(payload.page, payload.pageName),
    path: pickFirst(payload.path, payload.pagePath),
    durationSeconds,
    activeSeconds,
    device: pickFirst(payload.device, payload.deviceType, payload.platform),
    browser: pickFirst(payload.browser),
    location: pickFirst(payload.location, payload.city, payload.district),
    permissionGranted: pickFirst(payload.permissionGranted) || "default",
    pushEnabled: isPushEnabled(payload),
    notificationsEnabled: isPushEnabled(payload),
    hasSubscription: isPushEnabled(payload),
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    activityAt: pickFirst(payload.activityAt, payload.occurredAt, payload.createdAt, createdAt),
    createdAt,
  };
};

const createProfileMessageRecord = ({ campaignId, payload, recipient, createdAt }) => ({
  id: crypto.randomUUID(),
  campaignId,
  recipientId: pickFirst(recipient.id, recipient.userId, recipient.mobileNumber),
  userId: pickFirst(recipient.userId, recipient.id),
  mobileNumber: pickFirst(recipient.mobileNumber),
  installId: pickFirst(recipient.installId),
  name: pickFirst(recipient.name) || "Unknown user",
  title: asTrimmedString(payload.title),
  body: asTrimmedString(payload.body),
  ctaLabel: pickFirst(payload.ctaLabel),
  ctaUrl: pickFirst(payload.ctaUrl),
  offerCode: pickFirst(payload.offerCode),
  campaignType: pickFirst(payload.campaignType) || "offer-notification",
  audience: pickFirst(payload.audience) || "selected",
  status: "unread",
  showOnProfile: true,
  createdAt,
  storedAt: createdAt,
});

const helpRequestTopics = new Set([
  "delivery",
  "placing-orders",
  "offers",
  "other",
]);

const normalizeHelpRequestTopic = (value) => {
  const normalized = asTrimmedString(value).toLowerCase().replace(/\s+/g, "-");
  return helpRequestTopics.has(normalized) ? normalized : "other";
};

const createHelpRequestRecord = (payload) => {
  const createdAt = nowIso();
  const topic = normalizeHelpRequestTopic(payload.topic);
  const message = asTrimmedString(payload.message);
  const title =
    asTrimmedString(payload.title) ||
    `${topic.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())} help request`;

  return {
    id: crypto.randomUUID(),
    userId: pickFirst(payload.userId, payload.UserId),
    installId: pickFirst(payload.installId, payload.deviceId),
    mobileNumber: pickFirst(payload.mobileNumber, payload.phoneNumber, payload.phone),
    name: pickFirst(payload.name, payload.fullName, payload.userName) || "Unknown user",
    title,
    topic,
    message,
    status: "open",
    adminReply: "",
    source: payload.source && typeof payload.source === "object" ? payload.source : null,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
    createdAt,
    updatedAt: createdAt,
  };
};

const buildUserActivitySummary = ({ installs, logins, activities, messages }) => {
  const summaryMap = new Map();

  const touchLatest = (summary, field, candidate) => {
    if (!candidate) {
      return;
    }

    const nextTime = parseDate(candidate)?.getTime() || 0;
    const currentTime = parseDate(summary[field])?.getTime() || 0;

    if (nextTime >= currentTime) {
      summary[field] = candidate;
    }
  };

  const getSummarySortTime = (summary) =>
    parseDate(
      pickFirst(
        summary.lastActiveAt,
        summary.lastSeenAt,
        summary.lastActivityAt,
        summary.lastLoginAt,
        summary.lastMessageAt
      )
    )?.getTime() || 0;

  const ensureSummary = (record, index) => {
    const key = resolveSummaryKey(record, index);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        id: key,
        userId: "",
        installId: "",
        mobileNumber: "",
        name: "Unknown user",
        device: "",
        browser: "",
        location: "",
        permissionGranted: "default",
        pushEnabled: false,
        notificationsEnabled: false,
        hasSubscription: false,
        totalLogins: 0,
        totalEvents: 0,
        totalActiveSeconds: 0,
        totalMessages: 0,
        unreadMessages: 0,
        recentActions: [],
        recentEvents: [],
        lastSeenAt: "",
        lastLoginAt: "",
        lastActivityAt: "",
        lastMessageAt: "",
        lastActiveAt: "",
        lastCategory: "",
        lastQuantity: null,
        activeStatus: "inactive",
        isActive: false,
        activeTtlMs: profileActiveTtlMs,
      });
    }

    return summaryMap.get(key);
  };

  const appendRecentEvent = (summary, event) => {
    if (!event || !event.occurredAt) {
      return;
    }

    const existing = summary.recentEvents.filter((item) => item.id !== event.id);
    const sorted = [event, ...existing].sort((left, right) => {
      const leftTime = parseDate(left.occurredAt)?.getTime() || 0;
      const rightTime = parseDate(right.occurredAt)?.getTime() || 0;
      return rightTime - leftTime;
    });

    summary.recentEvents = sorted.slice(0, recentEventLimit);
  };

  const buildRecentEvent = ({ record, fallbackType, fallbackAction, occurredAt, metadataExtra = {} }) => {
    const metadata = {
      ...asObject(record.metadata),
      ...asObject(metadataExtra),
    };

    const quantity = toFiniteNumberOrNull(
      metadata.quantity ??
        metadata.qty ??
        metadata.noOfQuantity ??
        record.quantity ??
        record.qty ??
        record.noOfQuantity
    );
    const category = pickFirst(
      metadata.category,
      metadata.selectedCategory,
      record.category,
      record.categoryName
    );

    return {
      id:
        pickFirst(record.id) ||
        `${fallbackType}-${pickFirst(record.userId, record.mobileNumber, record.installId) || "unknown"}-${occurredAt}`,
      type: fallbackType,
      eventType: pickFirst(record.eventType, fallbackType),
      action: pickFirst(record.action, fallbackAction, record.eventType, fallbackType),
      occurredAt,
      createdAt: pickFirst(record.createdAt, occurredAt),
      page: pickFirst(record.page),
      path: pickFirst(record.path),
      category,
      quantity,
      metadata,
    };
  };

  const mergeCommonFields = (summary, record) => {
    summary.userId = pickFirst(record.userId, record.UserId, summary.userId);
    summary.installId = pickFirst(record.installId, record.deviceId, summary.installId);
    summary.mobileNumber = pickFirst(
      record.mobileNumber,
      record.phoneNumber,
      record.phone,
      summary.mobileNumber
    );

    const existingName = summary.name === "Unknown user" ? "" : summary.name;
    summary.name = pickFirst(record.name, record.fullName, record.userName, existingName) || "Unknown user";
    summary.device = pickFirst(record.device, record.deviceType, record.platform, summary.device);
    summary.browser = pickFirst(record.browser, summary.browser);
    summary.location = pickFirst(record.location, record.city, record.district, summary.location);

    const existingPermission = summary.permissionGranted === "default" ? "" : summary.permissionGranted;
    summary.permissionGranted = pickFirst(record.permissionGranted, existingPermission) || "default";
    summary.pushEnabled = summary.pushEnabled || isPushEnabled(record);
    summary.notificationsEnabled = summary.notificationsEnabled || isPushEnabled(record);
    summary.hasSubscription =
      summary.hasSubscription || Boolean(record.hasSubscription) || Boolean(record.pushSubscription);
  };

  installs.forEach((record, index) => {
    const summary = ensureSummary(record, index);
    const occurredAt = pickFirst(record.lastSeenAt, record.updatedAt, record.createdAt);
    mergeCommonFields(summary, record);
    touchLatest(summary, "lastSeenAt", occurredAt);
    touchLatest(summary, "lastActiveAt", occurredAt);
    appendRecentEvent(
      summary,
      buildRecentEvent({
        record,
        fallbackType: "install",
        fallbackAction: record.pushEnabled ? "push_install_registered" : "install_seen",
        occurredAt,
        metadataExtra: {
          sourceChannel: pickFirst(record.source?.channel),
        },
      })
    );
  });

  logins.forEach((record, index) => {
    const summary = ensureSummary(record, index + installs.length);
    const occurredAt = pickFirst(record.loginAt, record.createdAt);
    mergeCommonFields(summary, record);
    summary.totalLogins += 1;
    touchLatest(summary, "lastLoginAt", occurredAt);
    touchLatest(summary, "lastActiveAt", occurredAt);
    appendRecentEvent(
      summary,
      buildRecentEvent({
        record,
        fallbackType: "login",
        fallbackAction: "login",
        occurredAt,
      })
    );
  });

  activities.forEach((record, index) => {
    const summary = ensureSummary(record, index + installs.length + logins.length);
    const occurredAt = pickFirst(record.activityAt, record.createdAt);
    mergeCommonFields(summary, record);
    summary.totalEvents += 1;
    summary.totalActiveSeconds += asNumber(record.activeSeconds, asNumber(record.durationSeconds));
    touchLatest(summary, "lastActivityAt", occurredAt);
    touchLatest(summary, "lastActiveAt", occurredAt);
    appendRecentEvent(
      summary,
      buildRecentEvent({
        record,
        fallbackType: "activity",
        fallbackAction: pickFirst(record.action, record.eventType, "activity"),
        occurredAt,
      })
    );
  });

  messages.forEach((record, index) => {
    const summary = ensureSummary(record, index + installs.length + logins.length + activities.length);
    const occurredAt = pickFirst(record.createdAt, record.storedAt);
    mergeCommonFields(summary, record);
    summary.totalMessages += 1;
    summary.unreadMessages += record.status === "read" ? 0 : 1;
    touchLatest(summary, "lastMessageAt", occurredAt);
    appendRecentEvent(
      summary,
      buildRecentEvent({
        record,
        fallbackType: "message",
        fallbackAction: "profile_message_sent",
        occurredAt,
        metadataExtra: {
          title: pickFirst(record.title),
          campaignType: pickFirst(record.campaignType),
        },
      })
    );
  });

  return Array.from(summaryMap.values())
    .map((summary) => {
      const recentEvents = [...summary.recentEvents].sort((left, right) => {
        const leftTime = parseDate(left.occurredAt)?.getTime() || 0;
        const rightTime = parseDate(right.occurredAt)?.getTime() || 0;
        return rightTime - leftTime;
      });
      const recentActions = [];
      for (const event of recentEvents) {
        const action = pickFirst(event.action, event.eventType);
        if (action && !recentActions.includes(action)) {
          recentActions.push(action);
        }
        if (recentActions.length >= 5) {
          break;
        }
      }

      const lastRelevantAt = pickFirst(
        summary.lastActiveAt,
        summary.lastSeenAt,
        summary.lastActivityAt,
        summary.lastLoginAt,
        summary.lastMessageAt
      );
      const lastRelevantTime = parseDate(lastRelevantAt)?.getTime() || 0;
      const isActive = Boolean(lastRelevantTime && Date.now() - lastRelevantTime <= profileActiveTtlMs);
      const lastCategory = recentEvents.map((event) => event.category).find(Boolean) || "";
      const lastQuantity = recentEvents
        .map((event) => event.quantity)
        .find((value) => Number.isFinite(value));

      return {
        ...summary,
        recentEvents,
        recentActions,
        lastCategory,
        lastQuantity: Number.isFinite(lastQuantity) ? lastQuantity : null,
        activeStatus: isActive ? "active" : "inactive",
        isActive,
        activeTtlMs: profileActiveTtlMs,
      };
    })
    .sort((left, right) => getSummarySortTime(right) - getSummarySortTime(left));
};

const shapeInstallResponse = (record) => ({
  installId: record.installId,
  id: record.userId || record.installId,
  userId: record.userId || record.installId,
  name: record.name,
  fullName: record.fullName,
  mobileNumber: record.mobileNumber,
  phoneNumber: record.mobileNumber,
  device: record.device,
  browser: record.browser,
  location: record.location,
  district: record.district,
  city: record.city,
  state: record.state,
  permissionGranted: record.permissionGranted,
  pushEnabled: record.pushEnabled,
  notificationsEnabled: record.notificationsEnabled,
  hasSubscription: record.hasSubscription,
  lastSeen: record.lastSeenAt,
  lastSeenAt: record.lastSeenAt,
  updatedAt: record.updatedAt,
  createdAt: record.createdAt,
  source: record.source,
});

const filterBySearch = (records, query) => {
  const needle = asTrimmedString(query).toLowerCase();
  if (!needle) {
    return records;
  }

  return records.filter((record) =>
    [
      record.name,
      record.fullName,
      record.userId,
      record.mobileNumber,
      record.device,
      record.browser,
      record.location,
      record.city,
      record.district,
      record.state,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(needle))
  );
};

const filterByActiveStatus = (records, requestedStatus) => {
  const normalizedStatus = asTrimmedString(requestedStatus).toLowerCase();

  if (!normalizedStatus || normalizedStatus === "all") {
    return records;
  }

  if (normalizedStatus !== "active" && normalizedStatus !== "inactive") {
    return records;
  }

  return records.filter((record) =>
    String(record.activeStatus || (record.isActive ? "active" : "inactive")).toLowerCase() ===
    normalizedStatus
  );
};

const filterByRecency = (records, activeSinceHours, ...dateKeys) => {
  if (!activeSinceHours || Number.isNaN(Number(activeSinceHours))) {
    return records;
  }
  const threshold = Date.now() - Number(activeSinceHours) * 60 * 60 * 1000;
  return records.filter((record) => {
    for (const key of dateKeys) {
      const timestamp = parseDate(record[key]);
      if (timestamp && timestamp.getTime() >= threshold) {
        return true;
      }
    }
    return false;
  });
};

const sortDraftOrdersByDateDesc = (left, right) => {
  const leftTime = parseDate(left.date)?.getTime() || 0;
  const rightTime = parseDate(right.date)?.getTime() || 0;
  return rightTime - leftTime;
};

const normalizeDraftOrderProduct = (product, orderIndex, categoryIndex, productIndex) => ({
  id:
    pickFirst(product.code, product.Code, product.ProductName, product.productName) ||
    `product-${orderIndex}-${categoryIndex}-${productIndex}`,
  code: pickFirst(product.code, product.Code),
  productName: pickFirst(product.ProductName, product.productName, product.name) || "Unnamed product",
  noOfQuantity: asNumber(pickFirst(product.NoOfQuantity, product.noOfQuantity, product.qty)),
  units: pickFirst(product.Units, product.units),
  afterDiscountPrice: pickFirst(product.AfterDiscountPrice, product.afterDiscountPrice, product.Price),
  price: pickFirst(product.Price, product.price, product.MRP, product.mrp),
  mrp: pickFirst(product.MRP, product.mrp),
});

const normalizeDraftOrderCategory = (category, orderIndex, categoryIndex) => ({
  id: pickFirst(category.CategoryName, category.categoryName) || `category-${orderIndex}-${categoryIndex}`,
  categoryName: pickFirst(category.CategoryName, category.categoryName) || "Uncategorized",
  numberOfItemsSelected: asNumber(
    pickFirst(category.NumberOfItemsSelected, category.numberOfItemsSelected)
  ),
  totalAmount: pickFirst(category.TotalAmount, category.totalAmount),
  products: Array.isArray(category.Products)
    ? category.Products.map((product, productIndex) =>
        normalizeDraftOrderProduct(product, orderIndex, categoryIndex, productIndex)
      )
    : Array.isArray(category.products)
      ? category.products.map((product, productIndex) =>
          normalizeDraftOrderProduct(product, orderIndex, categoryIndex, productIndex)
        )
      : [],
});

const normalizeDraftOrderRecord = (record, index = 0) => ({
  id: pickFirst(record.id) || `draft-order-${index}`,
  customerId: pickFirst(record.customerId, record.CustomerId),
  customerPhoneNumber: normalizePhoneNumber(
    pickFirst(
      record.CustomerPhoneNumber,
      record.customerPhoneNumber,
      record.customerPhonenumber,
      record.PhoneNumber,
      record.phoneNumber,
      record.mobileNumber
    )
  ),
  customerName: pickFirst(record.CustomerName, record.customerName),
  status: pickFirst(record.Status, record.status) || "Unknown",
  date: pickFirst(record.Date, record.date),
  paymentMode: pickFirst(record.PaymentMode, record.paymentMode) || "-",
  grandTotal: pickFirst(record.GrandTotal, record.grandTotal),
  totalItemsSelected: asNumber(pickFirst(record.TotalItemsSelected, record.totalItemsSelected)),
  martId: pickFirst(record.MartId, record.martId),
  address: pickFirst(record.Address, record.address),
  district: pickFirst(record.District, record.district),
  state: pickFirst(record.State, record.state),
  assignedTo: pickFirst(record.AssignedTo, record.assignedTo),
  isDelivered: Boolean(record.IsDelivered ?? record.isDelivered),
  categories: Array.isArray(record.Categories)
    ? record.Categories.map((category, categoryIndex) =>
        normalizeDraftOrderCategory(category, index, categoryIndex)
      )
    : Array.isArray(record.categories)
      ? record.categories.map((category, categoryIndex) =>
          normalizeDraftOrderCategory(category, index, categoryIndex)
        )
      : [],
});

const getMartOrdersContainer = async () => {
  if (!hasConfiguredMartOrdersStore()) {
    throw new Error("Cosmos DB draft-order store is not configured.");
  }

  if (!martOrdersContainerPromise) {
    martOrdersContainerPromise = (async () => {
      const client = getCosmosClient();
      const container = client.database(cosmosDatabaseId).container(cosmosContainerId);
      await container.read();
      return container;
    })().catch((error) => {
      martOrdersContainerPromise = null;
      throw error;
    });
  }

  return martOrdersContainerPromise;
};

const fetchMartOrdersByMobileNumber = async (mobileNumber) => {
  const normalizedMobileNumber = normalizePhoneNumber(mobileNumber);
  if (!normalizedMobileNumber) {
    return [];
  }

  const container = await getMartOrdersContainer();
  const { resources } = await container.items
    .query(
      {
        query: `
          SELECT * FROM c
          WHERE IS_DEFINED(c.MartId) AND c.MartId != null
            AND IS_DEFINED(c.CustomerPhoneNumber)
            AND c.CustomerPhoneNumber = @mobileNumber
        `,
        parameters: [{ name: "@mobileNumber", value: normalizedMobileNumber }],
      },
      {
        enableCrossPartitionQuery: true,
      }
    )
    .fetchAll();

  return resources.map((record, index) => normalizeDraftOrderRecord(record, index)).sort(sortDraftOrdersByDateDesc);
};

const fetchMartOrderMatchesByMobileNumbers = async (mobileNumbers) => {
  const normalizedMobileNumbers = [...new Set(mobileNumbers.map(normalizePhoneNumber).filter(Boolean))];
  const matches = new Map();
  const checkedAt = nowIso();

  normalizedMobileNumbers.forEach((mobileNumber) => {
    matches.set(mobileNumber, {
      status: "empty",
      hasDraftOrders: false,
      draftCount: 0,
      totalOrders: 0,
      mobileNumber,
      checkedAt,
    });
  });

  if (!normalizedMobileNumbers.length || !hasConfiguredMartOrdersStore()) {
    return matches;
  }

  const container = await getMartOrdersContainer();

  try {
    const { resources } = await container.items
      .query(
        {
          query: `
            SELECT c.CustomerPhoneNumber, c.Status, c.Date, c.MartId
            FROM c
            WHERE IS_DEFINED(c.MartId) AND c.MartId != null
              AND IS_DEFINED(c.CustomerPhoneNumber)
              AND ARRAY_CONTAINS(@mobileNumbers, c.CustomerPhoneNumber)
          `,
          parameters: [{ name: "@mobileNumbers", value: normalizedMobileNumbers }],
        },
        {
          enableCrossPartitionQuery: true,
        }
      )
      .fetchAll();

    resources.forEach((record) => {
      const mobileNumber = normalizePhoneNumber(
        pickFirst(record.CustomerPhoneNumber, record.customerPhoneNumber)
      );
      if (!mobileNumber || !matches.has(mobileNumber)) {
        return;
      }

      const nextMatch = matches.get(mobileNumber);
      nextMatch.totalOrders += 1;
      if (isDraftOrderStatus(pickFirst(record.Status, record.status))) {
        nextMatch.draftCount += 1;
        nextMatch.hasDraftOrders = true;
        nextMatch.status = "live";
      }
    });

    return matches;
  } catch (error) {
    console.warn("Bulk draft-order match query failed; falling back to per-user queries.", error);

    for (const mobileNumber of normalizedMobileNumbers) {
      const orders = await fetchMartOrdersByMobileNumber(mobileNumber);
      const nextMatch = matches.get(mobileNumber);
      nextMatch.totalOrders = orders.length;
      nextMatch.draftCount = orders.filter((order) => isDraftOrderStatus(order.status)).length;
      nextMatch.hasDraftOrders = nextMatch.draftCount > 0;
      nextMatch.status = nextMatch.hasDraftOrders ? "live" : "empty";
    }

    return matches;
  }
};

app.get("/health", async (_req, res) => {
  const [installs, logins, sendLogs, activities, profileMessages, helpRequests] = await Promise.all([
    readJsonArray(installsFile),
    readJsonArray(loginActivityFile),
    readJsonArray(sendLogsFile),
    readJsonArray(activityEventsFile),
    readJsonArray(profileMessagesFile),
    readJsonArray(helpRequestsFile),
  ]);

  res.json({
    status: "ok",
    service: "handyman-push-api",
    counts: {
      installs: installs.length,
      loginEvents: logins.length,
      activityEvents: activities.length,
      sendLogs: sendLogs.length,
      profileMessages: profileMessages.length,
      helpRequests: helpRequests.length,
    },
    serverTime: nowIso(),
  });
});

app.get("/api/view-installs", async (req, res, next) => {
  try {
    const installs = await readJsonArray(installsFile);
    const filtered = filterByRecency(
      filterBySearch(installs, req.query.search),
      req.query.activeSinceHours,
      "lastSeenAt",
      "updatedAt",
      "createdAt"
    )
      .filter((record) => record.pushEnabled || record.hasSubscription || record.mobileNumber || record.userId)
      .sort((left, right) => {
        const leftTime = parseDate(left.lastSeenAt)?.getTime() || 0;
        const rightTime = parseDate(right.lastSeenAt)?.getTime() || 0;
        return rightTime - leftTime;
      });
    res.json({
      items: filtered.map(shapeInstallResponse),
      count: filtered.length,
      totalStored: installs.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/push/register-install", async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    if (!pickFirst(payload.userId, payload.UserId, payload.installId, payload.mobileNumber)) {
      return res.status(400).json({
        error: "validation_error",
        message: "Provide at least one of userId, installId, or mobileNumber.",
      });
    }

    const installs = await readJsonArray(installsFile);
    const matchIndex = installs.findIndex((record) =>
      (payload.installId && record.installId === payload.installId) ||
      (payload.userId && record.userId === payload.userId) ||
      (payload.mobileNumber && record.mobileNumber === payload.mobileNumber)
    );

    const nextRecord = normalizeInstallRecord(payload, matchIndex >= 0 ? installs[matchIndex] : null);

    if (matchIndex >= 0) {
      installs[matchIndex] = nextRecord;
    } else {
      installs.push(nextRecord);
    }

    await writeJsonArray(installsFile, installs);

    res.status(matchIndex >= 0 ? 200 : 201).json({
      message: matchIndex >= 0 ? "Install updated." : "Install registered.",
      item: shapeInstallResponse(nextRecord),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/log-login", async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    if (!pickFirst(payload.userId, payload.UserId, payload.installId, payload.mobileNumber)) {
      return res.status(400).json({
        error: "validation_error",
        message: "Provide at least one of userId, installId, or mobileNumber for login activity.",
      });
    }

    const loginEvent = normalizeLoginActivity(payload);
    const [events, installs] = await Promise.all([
      readJsonArray(loginActivityFile),
      readJsonArray(installsFile),
    ]);

    events.push(loginEvent);

    const matchIndex = installs.findIndex((record) =>
      (loginEvent.installId && record.installId === loginEvent.installId) ||
      (loginEvent.userId && record.userId === loginEvent.userId) ||
      (loginEvent.mobileNumber && record.mobileNumber === loginEvent.mobileNumber)
    );

    const installPayload = {
      ...payload,
      installId: loginEvent.installId,
      userId: loginEvent.userId,
      mobileNumber: loginEvent.mobileNumber,
      name: loginEvent.name,
      device: loginEvent.device,
      browser: loginEvent.browser,
      location: loginEvent.location,
      lastSeenAt: loginEvent.loginAt,
      pushEnabled: payload.pushEnabled,
      notificationsEnabled: payload.notificationsEnabled,
      permissionGranted: payload.permissionGranted,
      source: payload.source,
    };

    const installRecord = normalizeInstallRecord(
      installPayload,
      matchIndex >= 0 ? installs[matchIndex] : null
    );

    if (matchIndex >= 0) {
      installs[matchIndex] = installRecord;
    } else {
      installs.push(installRecord);
    }

    await Promise.all([
      writeJsonArray(loginActivityFile, events),
      writeJsonArray(installsFile, installs),
    ]);

    res.status(201).json({
      message: "Login activity stored.",
      item: loginEvent,
      install: shapeInstallResponse(installRecord),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/login-activity", async (req, res, next) => {
  try {
    const events = await readJsonArray(loginActivityFile);
    const filtered = filterByRecency(
      filterBySearch(filterByIdentity(events, req.query), req.query.search),
      req.query.activeSinceHours,
      "loginAt",
      "createdAt"
    ).sort((left, right) => {
      const leftTime = parseDate(left.loginAt)?.getTime() || 0;
      const rightTime = parseDate(right.loginAt)?.getTime() || 0;
      return rightTime - leftTime;
    });
    res.json({
      items: filtered,
      count: filtered.length,
      totalStored: events.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/activity-event", async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    if (!pickFirst(payload.userId, payload.UserId, payload.installId, payload.mobileNumber)) {
      return res.status(400).json({
        error: "validation_error",
        message: "Provide at least one of userId, installId, or mobileNumber for activity tracking.",
      });
    }

    const activityEvent = normalizeActivityEvent(payload);
    const [events, installs] = await Promise.all([
      readJsonArray(activityEventsFile),
      readJsonArray(installsFile),
    ]);

    events.push(activityEvent);

    const matchIndex = installs.findIndex((record) =>
      (activityEvent.installId && record.installId === activityEvent.installId) ||
      (activityEvent.userId && record.userId === activityEvent.userId) ||
      (activityEvent.mobileNumber && record.mobileNumber === activityEvent.mobileNumber)
    );

    const installPayload = {
      ...payload,
      installId: activityEvent.installId,
      userId: activityEvent.userId,
      mobileNumber: activityEvent.mobileNumber,
      name: activityEvent.name,
      device: activityEvent.device,
      browser: activityEvent.browser,
      location: activityEvent.location,
      lastSeenAt: activityEvent.activityAt,
      pushEnabled: activityEvent.pushEnabled,
      notificationsEnabled: activityEvent.notificationsEnabled,
      permissionGranted: activityEvent.permissionGranted,
      source: payload.source,
    };

    const installRecord = normalizeInstallRecord(
      installPayload,
      matchIndex >= 0 ? installs[matchIndex] : null
    );

    if (matchIndex >= 0) {
      installs[matchIndex] = installRecord;
    } else {
      installs.push(installRecord);
    }

    await Promise.all([
      writeJsonArray(activityEventsFile, events),
      writeJsonArray(installsFile, installs),
    ]);

    res.status(201).json({
      message: "Activity event stored.",
      item: activityEvent,
      install: shapeInstallResponse(installRecord),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/activity-events", async (req, res, next) => {
  try {
    const events = await readJsonArray(activityEventsFile);
    const filtered = filterByRecency(
      filterBySearch(filterByIdentity(events, req.query), req.query.search),
      req.query.activeSinceHours,
      "activityAt",
      "createdAt"
    ).sort((left, right) => {
      const leftTime = parseDate(left.activityAt)?.getTime() || 0;
      const rightTime = parseDate(right.activityAt)?.getTime() || 0;
      return rightTime - leftTime;
    });

    res.json({
      items: filtered,
      count: filtered.length,
      totalStored: events.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/user-activity-summary", async (req, res, next) => {
  try {
    const [installs, logins, activities, profileMessages] = await Promise.all([
      readJsonArray(installsFile),
      readJsonArray(loginActivityFile),
      readJsonArray(activityEventsFile),
      readJsonArray(profileMessagesFile),
    ]);

    const allSummaries = buildUserActivitySummary({
      installs,
      logins,
      activities,
      messages: profileMessages,
    });

    let draftOrderMatches = new Map();
    try {
      draftOrderMatches = await fetchMartOrderMatchesByMobileNumbers(
        allSummaries.map((summary) => summary.mobileNumber)
      );
    } catch (error) {
      console.warn("Failed to load draft-order matches for activity summary.", error);
    }

    const summariesWithDraftOrders = allSummaries.map((summary) => {
      const normalizedMobileNumber = normalizePhoneNumber(summary.mobileNumber);
      const draftOrderMatch = normalizedMobileNumber
        ? draftOrderMatches.get(normalizedMobileNumber) || {
            status: "empty",
            hasDraftOrders: false,
            draftCount: 0,
            totalOrders: 0,
            mobileNumber: normalizedMobileNumber,
            checkedAt: nowIso(),
          }
        : {
            status: "blocked",
            hasDraftOrders: false,
            draftCount: 0,
            totalOrders: 0,
            mobileNumber: "",
            checkedAt: nowIso(),
          };

      return {
        ...summary,
        hasDraftOrders: draftOrderMatch.hasDraftOrders,
        draftOrderCount: draftOrderMatch.draftCount,
        totalMartOrders: draftOrderMatch.totalOrders,
        draftOrderStatus: draftOrderMatch.status,
        draftOrdersCheckedAt: draftOrderMatch.checkedAt,
      };
    });

    const filteredSummaries = filterByRecency(
      filterBySearch(
        filterByIdentity(filterByActiveStatus(summariesWithDraftOrders, req.query.status), req.query),
        req.query.search
      ),
      req.query.activeSinceHours,
      "lastActiveAt",
      "lastSeenAt",
      "lastLoginAt",
      "lastMessageAt"
    );
    const activeUsers = summariesWithDraftOrders.filter((summary) => summary.isActive).length;
    const pushReadyUsers = summariesWithDraftOrders.filter(
      (summary) => summary.pushEnabled || summary.hasSubscription
    ).length;
    const draftOrderUsers = summariesWithDraftOrders.filter((summary) => summary.hasDraftOrders).length;

    res.json({
      items: filteredSummaries,
      item: filteredSummaries[0] || null,
      count: filteredSummaries.length,
      totalStored: summariesWithDraftOrders.length,
      counts: {
        totalUsers: summariesWithDraftOrders.length,
        activeUsers,
        inactiveUsers: Math.max(0, summariesWithDraftOrders.length - activeUsers),
        pushReadyUsers,
        draftOrderUsers,
      },
      activeTtlMs: profileActiveTtlMs,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/draft-orders", async (req, res, next) => {
  try {
    const mobileNumber = normalizePhoneNumber(
      pickFirst(req.query.mobileNumber, req.query.CustomerPhoneNumber)
    );

    if (!mobileNumber) {
      return res.status(400).json({
        error: "validation_error",
        message: "Provide mobileNumber or CustomerPhoneNumber for draft-order lookup.",
      });
    }

    if (!hasConfiguredMartOrdersStore()) {
      return res.status(503).json({
        error: "service_unavailable",
        message: "Cosmos DB draft-order lookup is not configured for this service.",
      });
    }

    const allOrders = await fetchMartOrdersByMobileNumber(mobileNumber);
    const draftOrders = allOrders.filter((order) => isDraftOrderStatus(order.status));

    res.json({
      items: draftOrders,
      draftOrders,
      count: draftOrders.length,
      totalOrders: allOrders.length,
      mobileNumber,
      source: "cosmosdb",
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/profile-messages", async (req, res, next) => {
  try {
    const messages = await readJsonArray(profileMessagesFile);
    const filtered = filterByIdentity(messages, req.query)
      .filter((record) => record.showOnProfile !== false)
      .sort((left, right) => {
        const leftTime = parseDate(left.createdAt)?.getTime() || 0;
        const rightTime = parseDate(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      });

    res.json({
      items: filtered,
      item: filtered[0] || null,
      count: filtered.length,
      totalStored: messages.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/help-requests", async (req, res, next) => {
  try {
    const requests = await readJsonArray(helpRequestsFile);
    const filtered = filterByIdentity(requests, req.query)
      .filter((record) => {
        const requestedTopic = normalizeHelpRequestTopic(req.query.topic);
        if (!asTrimmedString(req.query.topic)) {
          return true;
        }
        return record.topic === requestedTopic;
      })
      .sort((left, right) => {
        const leftTime = parseDate(left.createdAt)?.getTime() || 0;
        const rightTime = parseDate(right.createdAt)?.getTime() || 0;
        return rightTime - leftTime;
      });

    res.json({
      items: filtered,
      item: filtered[0] || null,
      count: filtered.length,
      totalStored: requests.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/help-requests", async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const message = asTrimmedString(payload.message);

    if (!pickFirst(payload.userId, payload.UserId, payload.installId, payload.mobileNumber)) {
      return res.status(400).json({
        error: "validation_error",
        message: "Provide at least one of userId, installId, or mobileNumber for help requests.",
      });
    }

    if (!message) {
      return res.status(400).json({
        error: "validation_error",
        message: "Help request message is required.",
      });
    }

    const requests = await readJsonArray(helpRequestsFile);
    const requestRecord = createHelpRequestRecord(payload);
    requests.push(requestRecord);
    await writeJsonArray(helpRequestsFile, requests);

    res.status(201).json({
      message: "Help request submitted.",
      item: requestRecord,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/send-offer-notification", async (req, res, next) => {
  try {
    const payload = req.body && typeof req.body === "object" ? req.body : {};
    const title = asTrimmedString(payload.title);
    const body = asTrimmedString(payload.body);
    const recipients = Array.isArray(payload.recipients) ? payload.recipients : [];

    if (!title || !body) {
      return res.status(400).json({
        error: "validation_error",
        message: "Both title and body are required.",
      });
    }

    if (!recipients.length) {
      return res.status(400).json({
        error: "validation_error",
        message: "At least one recipient is required.",
      });
    }

    const [sendLogs, profileMessages] = await Promise.all([
      readJsonArray(sendLogsFile),
      readJsonArray(profileMessagesFile),
    ]);
    const createdAt = nowIso();
    const logEntry = {
      id: crypto.randomUUID(),
      campaignType: pickFirst(payload.campaignType) || "offer-notification",
      audience: pickFirst(payload.audience) || "selected",
      templateId: pickFirst(payload.templateId) || null,
      title,
      body,
      ctaLabel: pickFirst(payload.ctaLabel),
      ctaUrl: pickFirst(payload.ctaUrl),
      offerCode: pickFirst(payload.offerCode),
      filters: payload.filters && typeof payload.filters === "object" ? payload.filters : {},
      recipientIds: Array.isArray(payload.recipientIds)
        ? payload.recipientIds.filter(Boolean)
        : recipients
            .map((recipient) => recipient.id || recipient.userId || recipient.mobileNumber)
            .filter(Boolean),
      recipients: recipients.map((recipient) => ({
        id: pickFirst(recipient.id, recipient.userId, recipient.mobileNumber),
        userId: pickFirst(recipient.userId),
        mobileNumber: pickFirst(recipient.mobileNumber),
        installId: pickFirst(recipient.installId),
        name: pickFirst(recipient.name) || "Unknown user",
        device: pickFirst(recipient.device),
        location: pickFirst(recipient.location),
        lastSeenAt: pickFirst(recipient.lastSeenAt),
        source: recipient.source && typeof recipient.source === "object" ? recipient.source : null,
        deliveryStatus: "accepted",
      })),
      requestedAt: pickFirst(payload.createdAt, createdAt),
      storedAt: createdAt,
      status: "accepted",
      provider: pickFirst(process.env.PUSH_PROVIDER) || "storage-only",
      note: "Stored for delivery processing. Connect a push provider to perform actual device delivery.",
    };

    const nextMessages = logEntry.recipients.map((recipient) =>
      createProfileMessageRecord({
        campaignId: logEntry.id,
        payload,
        recipient,
        createdAt,
      })
    );

    sendLogs.push(logEntry);
    profileMessages.push(...nextMessages);
    await Promise.all([
      writeJsonArray(sendLogsFile, sendLogs),
      writeJsonArray(profileMessagesFile, profileMessages),
    ]);

    res.status(202).json({
      message: `Offer push accepted for ${logEntry.recipients.length} recipient${logEntry.recipients.length === 1 ? "" : "s"}.`,
      deliveryMode: logEntry.provider,
      campaignId: logEntry.id,
      accepted: logEntry.recipients.length,
      storedMessages: nextMessages.length,
      storedAt: logEntry.storedAt,
      note: logEntry.note,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/send-logs", async (req, res, next) => {
  try {
    const logs = await readJsonArray(sendLogsFile);
    const filtered = filterBySearch(logs, req.query.search).sort((left, right) => {
      const leftTime = parseDate(left.storedAt)?.getTime() || 0;
      const rightTime = parseDate(right.storedAt)?.getTime() || 0;
      return rightTime - leftTime;
    });

    res.json({
      items: filtered,
      count: filtered.length,
      totalStored: logs.length,
      serverTime: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    error: "internal_error",
    message: error.message || "Unexpected server error.",
  });
});

const start = async () => {
  await Promise.all([
    ensureDataFile(installsFile),
    ensureDataFile(loginActivityFile),
    ensureDataFile(sendLogsFile),
    ensureDataFile(activityEventsFile),
    ensureDataFile(profileMessagesFile),
    ensureDataFile(helpRequestsFile),
  ]);

  app.listen(port, () => {
    console.log(`HandyMan push API listening on port ${port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
