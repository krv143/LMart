import React, { useState } from "react";
import { Link } from "react-router-dom";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DashboardIcon from "@mui/icons-material/Dashboard";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import UploadIcon from "@mui/icons-material/Upload";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ForumIcon from "@mui/icons-material/Forum";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import DescriptionIcon from '@mui/icons-material/Description';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import LiveHelpIcon from '@mui/icons-material/LiveHelp';

const menuConfig = [
  { MenuIcon: <DashboardIcon />, MenuTitle: "Dashboard", TargetUrl: `https://lakshmisaiserviceproviders.com/Dashboard` },
  {
    MenuIcon: <AccountCircleIcon />,
    MenuTitle: "Profile Directory",
    TargetUrl: "#",
    subMenu: [
      { MenuTitle: "Customer", TargetUrl: "/ProfileDirectory/Customer" },
      { MenuTitle: "Trader / Dealer", TargetUrl: "/ProfileDirectory/Trader" },
      { MenuTitle: "Technician / Technical Agency", TargetUrl: "/ProfileDirectory/Technician" },
      { MenuTitle: "Builder / Contractor", TargetUrl: "/ProfileDirectory/Builder" },
      { MenuTitle: "Estimator / Engineer", TargetUrl: "/ProfileDirectory/Estimator" },
    ],
  },
  { MenuIcon: <ImportContactsIcon />, MenuTitle: "Customer Care Directory", TargetUrl: "/CustomerDirectory" },
  { MenuIcon: <PersonOutlineIcon />, MenuTitle: "Accounts", TargetUrl: "/Accounts" },
  { MenuIcon: <UploadIcon />, MenuTitle: "Upload Product", TargetUrl: "/product-list" },
  { MenuIcon: <DescriptionIcon />, MenuTitle: "Get A Technician Upload Job Description", TargetUrl: "" },
  { MenuIcon: <SupportAgentIcon />, MenuTitle: "Customer Care Helpdesk", TargetUrl: "/CustomerHelpDesk" },
  { MenuIcon: <NotificationsActiveIcon />, MenuTitle: "Push Notifications", TargetUrl: "/adminPushNotifications/Admin" },
  { MenuIcon: <LiveHelpIcon />, MenuTitle: "Live Chat", TargetUrl: "/adminLiveChat/Admin" },
  { MenuIcon: <ForumIcon />, MenuTitle: "Chat", TargetUrl: "/Chat" },
  { MenuIcon: <MailOutlineIcon />, MenuTitle: "SMS Center", TargetUrl: "/SMSCenter" },
  { MenuIcon: <GroupsIcon />, MenuTitle: "Meetings", TargetUrl: "/meetings" },
];

const Sidebar = () => {
  const [openDropdown, setOpenDropdown] = useState(null);

  const handleDropdownToggle = (menuTitle) => {
    setOpenDropdown(openDropdown === menuTitle ? null : menuTitle);
  };

  return (
    <div className="sidebar">
      {menuConfig.map((menu, index) => (
        <div key={index}>
          <div className="menu-item">
            <div
              className="_mnu_dv"
              onClick={() => menu.subMenu && handleDropdownToggle(menu.MenuTitle)}
              style={{
                display: "flex",
                justifyContent: "space-between",
                cursor: "pointer",
                color: "#212121",
                fontSize: "20px",
                textDecoration: "none",
              }}
            >
               <Link to={menu.TargetUrl}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", fontSize: "16px" }}>
                {menu.MenuIcon} {menu.MenuTitle}
              </div>
              </Link>
              {menu.subMenu && <ArrowDropDownIcon />}
            </div>
          </div>

          {menu.subMenu && openDropdown === menu.MenuTitle && (
            <div className="dropdown"  style={{
              marginLeft: "20px",
              padding: "5px 0",
            }}>
              {menu.subMenu.map((subItem, subIndex) => (
                <Link to={subItem.TargetUrl} key={subIndex} style={{
                  display: "block",
                  padding: "5px 15px",
                  fontSize: "14px",
                  color: "black", 
                  textDecoration: "none", 
                }}
                >
                  <div className="dropdown-item">{subItem.MenuTitle}</div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const App = () => {
  return (
    <div className="d-flex">
      <div className="m-0 p-0 adm_mnu">
        <Sidebar />
      </div>
    </div>
  );
};

export default App;
