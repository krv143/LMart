import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import '../App.css';
import {useNavigate } from "react-router-dom";
import HandyManCharacter from "../img/hm_char.png";
import HandyManLogo from "../img/Hm_Logo 1.png";
import { setLoginData } from "../utils/auth";
import { isOtpBypassNumber, OTP_BYPASS_LANDING } from "../config/loginBypass";
// import { appConfig } from "./config";

const LoginPage = () => {
  const Navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isChecked, setIsChecked] = useState('');
  const [showModal, setShowModal] = useState(false);
  const handleMobileChange = (e) => {
    const value = e.target.value;
    if (/^\d{0,10}$/.test(value)) {
        setMobile(value);   
    }
  };

  useEffect(() => {
    const input = document.getElementById('mobileInput');
    const preventDefault = (e) => e.preventDefault();
    ['copy', 'paste', 'cut', 'drop', 'contextmenu'].forEach(event =>
      input.addEventListener(event, preventDefault)
    );
    return () => {
      ['copy', 'paste', 'cut', 'drop', 'contextmenu'].forEach(event =>
        input.removeEventListener(event, preventDefault)
      );
    };
  }, []);

// Numbers listed in config/loginBypass.js sign in without an OTP and go
// straight to the delivery "New Orders" map page.
const handleOtpBypass = async () => {
  setSubmitted(true);
  try {
    const res = await fetch(
      `https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/UserOnBoarding/GuestUserVerificationByMobileNo?mobileNo=${mobile}`
    );
    if (res.status !== 200) {
      setError("This mobile number is not registered.");
      return;
    }
    const user = await res.json();
    if (!user?.userId) {
      setError("Could not sign in. Please try again.");
      return;
    }
    localStorage.setItem("mobile", mobile);
    setLoginData(user.userId);
    Navigate(`${OTP_BYPASS_LANDING}/${user.profileType || "customer"}/${user.userId}`);
  } catch (err) {
    console.error("Sign-in failed:", err);
    setError("Could not sign in. Please try again later.");
  } finally {
    setSubmitted(false);
  }
};

const handleOTP = async (e) => {
  e.preventDefault();
  if (!mobile) {  
    setError("Please enter a mobile number");
    return;
  }
  setError("");
  if (isOtpBypassNumber(mobile)) {
    await handleOtpBypass();
    return;
  }
  setSubmitted(true);
  const payload = {
    senderValue: mobile,
    type: "sms",
  };

  try {
    const response = await fetch(`https://lmartapiv1-fxcyd2b4btacgsav.westus2-01.azurewebsites.net/api/Auth/bhashsmssendotp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });      

    if (!response.ok) {
      throw new Error("Failed to send sms.");
    }
  
    const loginMeta = {
        mobile,
        };
      localStorage.setItem("loginMeta", JSON.stringify(loginMeta));
      localStorage.setItem("mobile", mobile);
      Navigate("/otpVerification", {
        state: loginMeta,
      });
  } catch (error) {
    console.error("Error sending sms:", error);
    setError('Failed to send sms. Please try again later.');
  } finally {
    setSubmitted(false);
  }
};

 return (
  <div className="h-100 mt-3 d-flex align-items-center py-2 flex-column">
  <div className="login_section rounded-5 p-3">
    <div className="d-flex align-items-center justify-content-center mb-3">
  <img 
    src={HandyManCharacter} 
    alt="Character"  
    width="200"  
    height="200" 
    className="img-fluid"
  />
</div>

<form className="d-flex gap-3 flex-column" onSubmit={handleOTP} autoComplete="off">
  <div className="row">
    <div className="col d-flex justify-content-center">
      <img 
        src={HandyManLogo} 
        alt="Logo" 
        width="190" 
        height="90" 
        className="img-fluid"
      />
    </div>
  </div>

  <h4 style={{fontSize: "15px", marginBottom: '0px'}}>Sign into your account</h4>
    <label>Mobile Number <span className="req_star mt-0">*</span></label>
    <div style={{ display: 'flex', gap: '0.5rem' }}>
   <input
    id="mobileInput"
    type="text"
    inputMode="numeric"
    pattern="[0-9]*"
    className="form-control mt-0"
    placeholder="Enter Mobile Number"
    value={mobile}
    onChange={handleMobileChange}
    autoComplete="off"
    required 
    style={{ width: '80%' }}
  />
  </div>
    {error && <div className="text-danger mt-1">{error}</div>}
   {/* <a className="link" href="/userIdLogin" style={{fontSize: "14px"}}>Login With User ID</a> */}
   <div className="d-flex align-items-center flex-wrap">
  <input 
    type="checkbox" 
    className="form-check-input border-dark me-2"
    checked={isChecked}
    required
    onChange={(e) => setIsChecked(e.target.checked)}
  />
  <button
    onClick={(e) => {
      e.preventDefault();
      setShowModal(true);
    }}
    className="text-dark p-0"
    style={{ 
      background: "none", 
      border: "none", 
      textDecoration: "underline", 
      cursor: "pointer",
      whiteSpace: "nowrap",
      fontSize: "14px",
    }}
  >
    Terms and conditions & Privacy Policy
  </button>
</div>   
      {/* Modal for Terms and Conditions */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button
      onClick={() => setShowModal(false)}
      style={{
        color: "red",
        position: "absolute",
        top: "10px",
        right: "15px",
        background: "none",
        border: "none",
        fontSize: "20px",
        fontWeight: "bold",
        cursor: "pointer"
      }}
    >
      ✕
    </button>
            <h2>Terms and Conditions</h2>
            <div className="text-justify">
                    <div className="mt-20">
                        <h4>I. YOUR ACCEPTANCE OF THIS AGREEMENT</h4>
                        <p>
                            This is an agreement between you ("you" or "your") and Lakshmi Sai Service Providers, a Proprietorship firm incorporated under the Registration of Establishment – Sec 2(b) and Sec 4(2) The Andhra Pradesh (Insurance of integrated Registration and Furnishing of Combined returns under various labour  Laws by certain Establishments) Act, 2015  with its registered office at Dr.No.44-40-12, Nandhagirinagar, Akkayyapalem, Visakhapatnam - 530016 ("Lakshmi Sai Service Provider" "we," or "our") that governs your use of the search services offered by Lakshmi Sai Service Providers through its website http://handymanserviceproviders.com ("Website"), using which Lakshmi Sai Service Providers may provide the search services ("Platform"). When you access or use Platform you agree to be bound by these Terms and Conditions ("Terms").
                        </p>
                    </div>
                    <div className="mt-20">
                        <h4>II. CHANGES</h4>
                        <p>
                            We may periodically change the Terms and the Site without notice, and you are responsible for checking these Terms periodically for revisions. All amended Terms become effective upon our posting to the Site, and any use of the site after such revisions have been posted signifies your consent to the changes.
                        </p>
                    </div>
                    <div className="mt-20">
                        <h4>III. HOW YOU MAY USE OUR MATERIALS</h4>
                        <p>
                            We use a diverse range of information, text, photographs, designs, graphics, images, sound and video recordings, animation, content, advertisement and other materials and effects (collectively "Materials") for the search services on the Platform. We provide the Materials through the Platform FOR YOUR PERSONAL AND NON-COMMERCIAL USE ONLY.
                        </p>
                        <p>
                            While every attempt has been made to ascertain the authenticity of the Platform content, Lakshmi Sai Service Providers is not liable for any kind of damages, losses or action arising directly or indirectly, due to access and/or use of the content in the Platform including but not limited to decisions based on the content in the Platform which results in any loss of revenue, profits, property etc.
                        </p>
                        <p>
                            Accordingly, you may view, use, copy, and distribute the Materials found on the Platform for internal, non-commercial, informational purposes only. You are prohibited from data mining, scraping, crawling, or using any process or processes that send automated queries to Lakshmi Sai Service Provider. You may not use the Platform or any of them to compile a collection of listings, including a competing listing product or service. You may not use the Platforms or any Materials for any unsolicited commercial e-mail. Except as authorized in this paragraph, you are not being granted a license under any copyright, trademark, patent or other intellectual property right in the Materials or the products, services, processes or technology described therein. All such rights are retained by Lakshmi Sai Service Provider, its subsidiaries, parent companies, and/or any third party owner of such rights.
                        </p>
                    </div>
                    <div className="mt-20">
                        <h4>IV. HOW YOU MAY USE OUR MARKS</h4>
                        <p>
                            The Lakshmi Sai Service Provider proprietorship firm names and logos and all related products and service names, design marks and slogans are trademarks and service marks owned by and used under license from Lakshmi Sai Service Provider or its wholly-owned subsidiaries. All other trademarks and service marks herein are the property of their respective owners. All copies that you make of the Materials on the Platform must bear any copyright, trademark or other proprietary notice located on the respective Platform that pertains to the material being copied. You are not authorized to use any HomeTriangl Lakshmi Sai Service Provider e name or mark in any advertising, publicity or in any other commercial manner without the prior written consent of Lakshmi Sai Service Provider. 
                        </p>
                    </div>
                    <div className="mt-20">
                        <h4>V. HOW WE MAY USE INFORMATION YOU PROVIDE TO US</h4>
                        <p>
                            Do not send us any confidential or proprietary information. Except for any personally identifiable information that we agree to keep confidential as provided in our Privacy Policy, any material, including, but not limited to any feedback, data, answers, questions, comments, suggestions, ideas or the like, which you send us will be treated as being non-confidential and nonproprietary. We assume no obligation to protect confidential or proprietary information (other than personally identifiable information) from disclosure and will be free to reproduce, use, and distribute the information to others without restriction. We will also be free to use any ideas, concepts, know-how or techniques contained in information that you send us for any purpose whatsoever including but not limited to developing, manufacturing and marketing products and services incorporating such information.
                        </p>
                    </div>
                    <div className="mt-20">
                        <h4>VI. REVIEWS, RATINGS & COMMENTS BY USERS</h4>
                        <p>
                            Since, Lakshmi Sai Service Provider provides information directory services website, your ("Users") use any of the aforementioned medium to post Reviews, Ratings and Comments about the Lakshmi Sai Service Provider services and also about the Advertiser's listed at Lakshmi Sai Service Provider is subject to additional terms and conditions as mentioned herein.
                        </p>
                        <p>
                            You are solely responsible for the content of any transmissions you make to the Site and any material you add to the Site, including but not limited to transmissions like your Reviews, Ratings & Comments posted by you(the "Communications"). Lakshmi Sai Service Provider does not endorse or accept any of your Communication as representative of their (Lakshmi Sai Service Provider) views. By transmitting any public Communication to the Site, you grant Lakshmi Sai Service Provider an irrevocable, non-exclusive, worldwide, perpetual, unrestricted, royalty-free license (with the right to sublicense) to use, reproduce, distribute, publicly display, publicly perform, adapt, modify, edit, createImageMedia derivative works from, incorporate into one or more compilations and reproduce and distribute such compilations, and otherwise exploit such Communications, in the Platform.
                        </p>
                        <p>
                            You confirm and warrant that you have the right to grant these rights to Lakshmi Sai Service Provider. You hereby waive and grant to Lakshmi Sai Service Provider all rights including intellectual property rights and also "moral rights" in your Communications, posted at Lakshmi Sai Service Provider is free to use all your Communications as per its requirements from time to time. You represent and warrant that you own or otherwise control all of the rights to the content that you post as Review, Rating or Comments; that the content is accurate; that use of the content you supply does not violate these Terms and will not cause injury to any person or entity. For removal of doubts it is clarified that, the reference to Communications would also mean to include the reviews, ratings and comments posted by your Friends tagged by you. Also Lakshmi Sai Service Provider reserves the right to mask or unmask your identity in respect of your Reviews, Ratings & Comments posted by you.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider has the right, but not the obligation to monitor and edit or remove any content posted by you as Review, Rating or Comments. Lakshmi Sai Service Provider cannot review all Communications made on its website. However, Lakshmi Sai Service Provider reserves the right, but has no obligation, to monitor and edit, modify or delete any Communications (or portions thereof) which Lakshmi Sai Service Provider in its sole discretion deems inappropriate, offensive or contrary to any Lakshmi Sai Service Provider policy, or that violate this terms:
                        </p>
                        <ul>
                        <li>
                            Lakshmi Sai Service Provider reserves the right not to upload or distribute to, or otherwise publish through the Site any Communication which
                        
                            is obscene, indecent, pornographic, profane, sexually explicit, threatening, or abusive;
                        </li>
                        <li>
                            constitutes or contains false or misleading indications of origin or statements of fact;
                        </li>
                        <li>
                            slanders, libels, defames, disparages, or otherwise violates the legal rights of any third party;
                        </li>
                        <li>
                            causes injury of any kind to any person or entity;
                        </li>
                        <li>
                            infringes or violates the intellectual property rights (including copyright, patent and trademark rights), contract rights, trade secrets, privacy or publicity rights or any other rights of any third party;
                        </li>
                        <li>
                            violates any applicable laws, rules, or regulations;
                        </li>
                        <li>
                            contains software viruses or any other malicious code designed to interrupt, destroy or limit the functionality of any computer software or hardware or telecommunications equipment;
                        </li>
                        <li>
                            impersonates another person or entity, or that collects or uses any information about Site visitors.
                        </li>
                        </ul>
                        <p>
                            It is also clarified that, if there are any issues or claims due to your posts by way of Reviews, Ratings and Comments, then Lakshmi Sai Service Provider reserves right to take appropriate legal action against you. Further, you shall indemnify and protect Lakshmi Sai Service Provider against such claims or damages or any issues, due to your posting of such Reviews, Ratings and Comments Lakshmi Sai Service Provider takes no responsibility and assumes no liability for any content posted by you or any third party on Lakshmi Sai Service Provider site or on any mediums of Lakshmi Sai Service Provider.
                        </p>
                        <p>
                            You further acknowledge that conduct prohibited in connection with your use of the Lakshmi Sai Service Provider (https://handymanserviceproviders.com) website includes, but is not limited to, breaching or attempting to breach the security of the Site.
                        </p>
                        <div className="mt-20">
                        <h4>VII. PRIVACY POLICY</h4>
                        <p>
                            Lakshmi Sai Service Provider is committed to protecting the privacy and confidentiality of any personal information that it may request and receive from its clients, business partners and other users of the Website. To read our privacy policy statement regarding such personal information please refer to PRIVACY POLICY.
                        </p>
                        </div>
                        <div className="mt-20">
                        <h4>VIII. CONTENT DISCLAIMER</h4>
                        <p>
                            Lakshmi Sai Service Provider communicates information provided and created by advertisers, homeowners, home improvement professionals and other third parties. While every attempt has been made to ascertain the authenticity of the content on the Platform Lakshmi Sai Service Provider has no control over content, the accuracy of such content, integrity or quality of such content and the information on our pages, and material on the Platform may include technical inaccuracies or typographical errors, and we make no guarantees, nor can we be responsible for any such information, including its authenticity, currency, content, quality, copyright compliance or legality, or any other intellectual property rights compliance, or any resulting loss or damage. Further, we are not liable for any kind of damages, losses or action arising directly or indirectly due to any content, including any errors or omissions in any content, access and/or use of the content on the Platform or any of them including but not limited to content based decisions resulting in loss of revenue, profits, property etc.
                        </p>
                        <p>
                            All of the data on products and promotions including but not limited to, the prices and the availability of any product or service is subject to change without notice by the party providing the product or promotion. You should use discretion while using the Platform.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider reserves the right, in its sole discretion and without any obligation, to make improvements to, or correct any error or omissions in, any portion of the Platform. Where appropriate, we will endeavor to update information listed on the Website on a timely basis, but shall not be liable for any inaccuracies.
                        </p>
                        <p>
                            All rights, title and interest including trademarks and copyrights in respect of the domain name and Platform content hosted on the Platform are reserved with Lakshmi Sai Service Provider. Users are permitted to read, print or download text, data and/or graphics from the Website or any other Platform for their personal use only. Unauthorized access, reproduction, redistribution, transmission and/or dealing with any information contained in the Platform in any other manner, either in whole or in part, are strictly prohibited, failing which strict legal action will be initiated against such users.
                        </p>
                        <p>
                            Links to external Internet sites may be provided within the content on Website as a convenience to users. The listing of an external site does not imply endorsement of the site by Lakshmi Sai Service Provider or its affiliates. Lakshmi Sai Service Provider does not make any representations regarding the availability and performance of its Platform or any of the external websites to which we provide links. When you click advertiser banners, sponsor links, or other external links from the Website, your browser automatically may direct you to a new browser window that is not hosted or controlled by Lakshmi Sai Service Provider.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider and its affiliates are not responsible for the content, functionality, authenticity or technological safety of these external sites. We reserve the right to disable links to or from third-party sites to our website, although we are under no obligation to do so. This right to disable links includes links to or from advertisers, sponsors, and home service providers that may use our Marks as part of a co-branding relationship.
                        </p>
                        <p>
                            Some external links may produce information that some people find objectionable, inappropriate, or offensive. We are not responsible for the accuracy, relevancy, copyright compliance, legality, or decency of material contained in any externally linked websites. We do not fully screen or investigate business listing websites before or after including them in directory listings that become part of the Materials on our Platform, and we make no representation and assume no responsibility concerning the content that third parties submit to become listed in any of these directories.
                        </p>
                        <p>
                            All those sections in the Platform that invite reader participation will contain views, opinion, suggestion, comments and other information provided by the general public, and Lakshmi Sai Service Provider will at no point of time be responsible for the accuracy or correctness of such information. Lakshmi Sai Service Provider reserves the absolute right to accept/reject information from readers and/or advertisements from advertisers and impose/relax Platform access rules and regulations for any user(s).
                        </p>
                        <p>
                            Lakshmi Sai Service Provider also reserves the right to impose/change the access regulations of the Platform , whether in terms of access fee, timings, equipment, access restrictions or otherwise, which shall be posted from time to time under these terms and conditions. It is the responsibility of users to refer to these terms and conditions each time they use the Platform.
                        </p>
                        <p>
                            While every attempt has been made to ascertain the authenticity of the content in the Platform, Lakshmi Sai Service Provider is not liable for any kind of damages, losses or action arising directly or indirectly, due to access and/or use of the content in the Platform including but not limited to any decisions based on content in the Platform resulting in loss of revenue, profits, property etc.
                        </p>
                        
                        </div>
                        <div className="mt-20">
                        <h4>IX. WARRANTY DISCLAIMER</h4>
                        <p>
                            Please remember that any provider of goods or services is entitled to register with Lakshmi Sai Service Provider. Lakshmi Sai Service Provider does not examine whether the advertisers are good, reputable or quality sellers of goods/service providers. You must satisfy yourself about all relevant aspects prior to availing of the terms of service. Lakshmi Sai Service Provider has also not negotiated or discussed any terms of engagement with any of the advertisers. The same should be done by you. Purchasing of goods or availing of services from advertisers shall be at your own risk.
                        </p>
                        <p>
                            We do not investigate, represent or endorse the accuracy, legality, legitimacy, validity or reliability of any products, services, other promotions or materials, including advice, ratings, and recommendations contained on, distributed through, or linked, downloaded or accessed from the Platform.
                        </p>
                        <p>
                            References that we make to any names, marks, products or services of third parties or hypertext links to third party sites or information do not constitute or imply our endorsement, sponsorship or recommendation of the third party, of the quality of any product or service, advice, information or other materials displayed, purchased, or obtained by you as a result of an advertisement or any other information or offer in or in connection with the Platform.
                        </p>
                        <p>
                            Any use of the Platform, reliance upon any Materials, and any use of the Internet generally shall be at your sole risk. Lakshmi Sai Service Provider disclaims any and all responsibility or liability for the accuracy, content, completeness, legality, reliability, or operability or availability of information or material displayed in the search results in the Platform.
                        </p>
                        <p>
                            THE MATERIAL AND THE PLATFORMS USED TO PROVIDE THE MATERIAL (INCLUDING THE WEBSITE ) ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. HOMETRIANGLE DISCLAIMS, TO THE FULLEST EXTENT PERMITTED UNDER LAW, ANY WARRANTIES REGARDING THE SECURITY, RELIABILITY, TIMELINESS, ACCURACY AND PERFORMANCE OF THE PLATFORMS AND MATERIALS. LAKSHMI SAI SERVICE PROVIDER DOES NOT WARRANT THAT ANY DEFECTS OR ERRORS WILL BE CORRECTED; OR THAT THE CONTENT IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
                        </p>
                        <p>
                            LAKSHMI SAI SERVICE PROVIDER DISCLAIMS ANY AND ALL WARRANTIES TO THE FULLEST EXTENT OF THE LAW, INCLUDING ANY WARRANTIES FOR ANY INFORMATION, GOODS, OR SERVICES, OBTAINED THROUGH, ADVERTISED OR RECEIVED THROUGH ANY LINKS PROVIDED BY OR THROUGH THE PLATFORM SOME COUNTRIES OR OTHER JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES, SO THE ABOVE EXCLUSIONS MAY NOT APPLY TO YOU. YOU MAY ALSO HAVE OTHER RIGHTS THAT VARY FROM COUNTRY TO COUNTRY AND JURISDICTION TO JURISDICTION.
                        </p>
                        
                        </div>
                        <div className="mt-20">
                        <h4>X. USING HANDYMANSERVICEPROVIDERS.COM LOCAL SERVICE NEED FULFILLMENT</h4>
                        <p>
                            Users of this service are responsible for all aspects of the transactions in which they choose to participate. Users of this service should be aware that:
                        </p>
                        <p>
                            Service Providers and Users are completely responsible for working out the exchange and performance of services. Lakshmi Sai Service Provider is not responsible for any non-performance or breach of any contract entered into between the Users and Service Providers. Lakshmi Sai Service Provider cannot and does not guarantee that the concerned Service Provider will perform any transaction concluded on this Platform.
                        </p>
                        <p>
                            Both User and Service Provider do hereby agree that Lakshmi Sai Service Provider shall not be required to mediate or resolve any dispute or disagreement that might arise between the parties out of these transactions.
                        </p>
                        <p>
                            Service Providers and Users are responsible for researching and complying with any applicable laws, regulations or restrictions on items, services, or manner of sale or exchange that may pertain to transactions in which they participate.
                        </p>
                        <p>
                            Service Providers and Users are responsible for all applicable taxes and for all costs incurred by participating in the local service need fulfillment platform.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider will not be liable for damages of any kind incurred to any parties as a result of the information contained on this Platform. Users shall not use or manipulate this service for any fraudulent activity or purpose. Items or services offered for sale must comply with applicable laws. Lakshmi Sai Service Provider disclaims any and / or all responsibility and / or liability for any harm resulting from your use of third party services, and you hereby irrevocably waive any claim against Lakshmi Sai Service Provider with respect to the Content or operation of any third party services.
                        </p>
                        <p>
                            Using our Services does not give you ownership of any intellectual property rights in our Services or the Content you access. These terms do not grant you the right to use any branding or logos used in our Services.
                        </p>
                        <p>
                            You agree to comply with the Terms of Use and acknowledge that Lakshmi Sai Service Provider reserves the right to terminate your account or take such other action ( including legal remedies) as deemed fit if you commit breach of any Terms of Use.
                        </p>
                        <p>
                            User agrees that he / she / they, indemnify Lakshmi Sai Service Provider, its employees, officers, agents and directors from claims, demands and damages (actual and consequential) of every kind and nature, known and unknown, suspected and unsuspected, disclosed and undisclosed, arising out of or in any way connected with transactions or disputes.
                        </p>
                        <p>
                            We do not control the information provided by other Users that is made available through our system. Users may find other User's information to be offensive, harmful, inaccurate, or deceptive. Please use caution and common sense for your own safety. Please note that there are also risks of dealing with underage persons or people acting under false pretence. Additionally, there may also be risks dealing with international trade and foreign nationals.
                        </p>
                        <p>
                            It is confirmed and acknowledged by the User that, all/any information provided by the User, including name, age, contact details and other details to this Platform are accurate and can be used and forwarded by this Platform to Service Provider(s). Any such act, committed by Lakshmi Sai Service Provider shall not constitute a violation of privacy or other rights of the User.
                        </p>
                        <p>
                            This Platform is not liable for any transactions between the User and Service Provider. Lakshmi Sai Service Provider holds no responsibility for unsatisfactory or delayed services, nor for any damages incurred during service. However, in cases of escalated services, coverage up to Rs.10,000 is provided, subject to a proper inspection of the scenario.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider does not make any kind of warranties or representation on delivery, service, quality, suitability and availability of services on this Platform.
                        </p>
                        <p>
                            Lakshmi Sai Service Provider shall not be responsible for any loss or damage whatsoever that may be suffered or any personal injury that may be suffered to a User, directly or indirectly by use or non-use of services mentioned on this Platform.
                        </p>
                        <p>
                            Prices mentioned (if any) on this Platform are subject to change. Users are advised to check with Service Provider for the final price and additional charges applicable, if any. Users does hereby agree to absolve Lakshmi Sai Service Provider from all/any dispute in relation to price of services.
                        </p>
                        <p>
                            You hereby approve and / or authorise Lakshmi Sai Service Provider to take such measures as are necessary for security purposes and / or improving the quality of services and / or to enhance and provide better Service Provider services to the satisfaction of the User. The User hereby disclaims his right to prevent and/ or proceed against Lakshmi Sai Service Provider in relation to the same.
                        </p>
                        
                        </div>
                        
                        <div className="mt-20">
                        <h4>XII. ADDITIONAL DISCLAIMER</h4>
                        <p>
                            Users using any of Lakshmi Sai Service Provider service across the following mediums ie. through internet ie <a href="https://handymanserviceproviders.com"> https://handymanserviceproviders.com </a>Websiteis bound by this additional disclaimer wherein they are cautioned to make proper enquiry before they (Users) rely, act upon or enter into any transaction (any kind or any sort of transaction including but not limited to monetary transaction ) with the Advertiser listed with Lakshmi Sai Service Provider.
                        </p>
                        <p>
                            All the Users are cautioned that all and any information of whatsoever nature provided or received from the Advertiser/s is taken in good faith, without least suspecting the bonafides of the Advertiser/s and Lakshmi Sai Service Provider does not confirm, does not acknowledge, or subscribe to the claims and representation made by the Advertiser/s listed with Lakshmi Sai Service Provider. Further, Lakshmi Sai Service Provider is not at all responsible for any act of Advertiser/s listed at Lakshmi Sai Service Provider.
                        </p>
                        </div>
                        
                        <div className="mt-20">
                        <h4>XIII. LIMITATION OF LIABILITY</h4>
                        <p>
                            IN NO EVENT SHALL LAKSHMI SAI SERVICE PROVIDER BE LIABLE TO ANY USER ON ACCOUNT OF SUCH USER'S USE, MISUSE OR RELIANCE ON THE PLATFORMS FOR ANY DAMAGES WHATSOEVER, INCLUDING DIRECT, SPECIAL, PUNITIVE, INDIRECT, CONSEQUENTIAL OR INCIDENTAL DAMAGES OR DAMAGES FOR LOSS OF PROFITS, REVENUE, USE, OR DATA WHETHER BROUGHT IN WARRANTY, CONTRACT, INTELLECTUAL PROPERTY INFRINGEMENT, TORT (INCLUDING NEGLIGENCE) OR OTHER THEORY, EVEN IF LAKSHMI SAI SERVICE PROVIDER IS AWARE OF OR HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE, ARISING OUT OF OR CONNECTED WITH THE USE (OR INABILITY TO USE) OR PERFORMANCE OF THE PLATFORM, THE MATERIALS OR THE INTERNET GENERALLY, OR THE USE (OR INABILITY TO USE), RELIANCE UPON OR PERFORMANCE OF ANY MATERIAL CONTAINED IN OR ACCESSED FROM ANY PLATFORMS. LAKSHMI SAI SERVICE PROVIDER DOES NOT ASSUME ANY LEGAL LIABILITY OR RESPONSIBILITY FOR THE ACCURACY, COMPLETENESS, OR USEFULNESS OF ANY INFORMATION, APPARATUS, PRODUCT OR PROCESS DISCLOSED ON THE PLATFORMS OR OTHER MATERIAL ACCESSIBLE FROM THE PLATFORM.
                        </p>
                        <p>
                            THE USER OF THE PLATFORM ASSUMES ALL RESPONSIBILITY AND RISK FOR THE USE OF THIS PLATFORM AND THE INTERNET GENERALLY. THE FOREGOING LIMITATIONS SHALL APPLY NOTWITHSTANDING ANY FAILURE OF THE ESSENTIAL PURPOSE OF ANY LIMITED REMEDY AND TO THE FULLEST EXTENT PERMITTED UNDER APPLICABLE LAW. SOME COUNTRIES DO NOT ALLOW THE EXCLUSION OR LIMITATION OF LIABILITY OF CONSEQUENTIAL OR INCIDENTAL DAMAGES, SO THE ABOVE EXCLUSIONS MAY NOT APPLY TO ALL USERS; IN SUCH COUNTRIES LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED BY LAW.
                        </p>
                        
                        </div>
                        
                        <div className="mt-20">
                        <h4>XIV. THIRD PARTY SITES</h4>
                        <p>
                            Your correspondence or business dealing with or participation in the sales promotions of advertisers or service providers found on or through the Platform, including payment and delivery of related goods or services, and any other terms, conditions, and warranties or representations associated with such dealings, are solely between you and such advertisers or service providers. You assume all risks arising out of or resulting from your transaction of business over the Internet, and you agree that we are not responsible or liable for any loss or result of the presence of information about or links to such advertisers or service providers on the Platform. You acknowledge and agree that we are not responsible or liable for the availability, accuracy, authenticity, copyright compliance, legality, decency or any other aspect of the content, advertising, products, services, or other materials on or available from such sites or resources. You acknowledge and agree that your use of these linked sites is subject to different terms of use than these Terms, and may be subject to different privacy practices than those set forth in the Privacy Policy governing the use of the Platforms. We do not assume any responsibility for review or enforcement of any local licensing requirements that may be applicable to businesses listed on the Platforms
                        </p>
                        <p>
                            <b>MONITORING OF MATERIALS TRANSMITTED BY YOU:</b> Changes may be periodically incorporated into the Platforms. Lakshmi Sai Service Provider may make improvements and/or changes in the products, services and/or programs described in the Platform and the Materials at any time without notice. We are under no obligation to monitor the material residing on or transmitted to the Platform. However, anyone using the Platform agrees that Lakshmi Sai Service Provider may monitor the Platform contents periodically to (1) comply with any necessary laws, regulations or other governmental requests; (2) to operate the Platform properly or to protect itself and its users. Lakshmi Sai Service Provider reserves the right to modify, reject or eliminate any material residing on or transmitted to its Platform that it, in its sole discretion, believes is unacceptable or in violation of the law or these Terms and Conditions.
                        </p>
                        <p>
                            <b>DELETIONS FROM SERVICE:</b> Lakshmi Sai Service Provider will delete any materials at the request of the user who submitted the materials or at the request of an advertiser who has decided to "opt-out" of the addition of materials to its advertising, including, but not limited to ratings and reviews provided by third parties. Lakshmi Sai Service Provider reserves the right to delete (or to refuse to post to public forums) any materials it deems detrimental to the system or is, or in the opinion of Lakshmi Sai Service Provider, may be, defamatory, infringing or violate of applicable law. Lakshmi Sai Service Provider reserves the right to exclude Material from the Platform. Materials submitted to Lakshmi Sai Service Provider for publication on the Platform may be edited for length, clarity and/or consistency with Lakshmi Sai Service Provider editorial standards.
                        </p>
                        
                        </div>
                        
                        <div className="mt-20">
                        <h4>XV. INDEMNIFICATION</h4>
                        <p>
                            You agree to indemnify and hold us and (as applicable) our parent, subsidiaries, affiliates, officers, directors, agents, and employees, harmless from any claim or demand, including reasonable attorneys' fees, made by any third party due to or arising out of your breach of these Terms, your violation of any law, or your violation of the rights of a third party, including the infringement by you of any intellectual property or other right of any person or entity. These obligations will survive any termination of the Terms.
                        </p>
                        </div>
                        
                        <div className="mt-20">
                        <h4>XVI. MISCELLANEOUS</h4>
                        <p>
                            These Terms will be governed by and construed in accordance with the Indian laws, without giving effect to its conflict of laws provisions or your actual state or country of residence, and you agree to submit to personal jurisdiction in India. You agree to exclude, in its entirety, the application to these Terms of the United Nations Convention on Contracts for the International Sale of Goods. You are responsible for compliance with applicable laws. If for any reason a court of competent jurisdiction finds any provision or portion of the Terms to be unenforceable, the remainder of the Terms will continue in full force and effect. These Terms constitute the entire agreement between us and supersedes and replaces all prior or contemporaneous understandings or agreements, written or oral, regarding the subject matter of these Terms. Any waiver of any provision of the Terms will be effective only if in writing and signed by you and Lakshmi Sai Service Provider. Lakshmi Sai Service Provider reserves the right to investigate complaints or reported violations of these Terms and to take any action we deem necessary and appropriate. Such action may include reporting any suspected unlawful activity to law enforcement officials, regulators, or other third parties. In addition, we may take action to disclose any information necessary or appropriate to such persons or entities relating to user profiles, e-mail addresses, usage history, posted materials, IP addresses and traffic information. Lakshmi Sai Service Provider reserves the right to seek all remedies available at law and in equity for violations of these Terms.
                        </p>
                        <p>
                            Force Majeure. In no event shall we or any Distribution Site have liability or be deemed to be in breach hereof for any failure or delay of performance resulting from any governmental action, fire, flood, insurrection, earthquake, power failure, network failure, riot, explosion, embargo, strikes (whether legal or illegal), terrorist act, labor or material shortage, transportation interruption of any kind or work slowdown or any other condition not reasonably within our control. Your payment obligations shall continue during any event of force majeure. Indemnification. You agree to indemnify us and the Distribution Sites and hold us and the Distribution Site harmless from and with respect to any claims, actions, liabilities, losses, expenses, damages and costs (including, without limitation, actual attorneys' fees) that may at any time be incurred by us or them arising out of or in connection with these Terms or any Advertising Products or services you request, including, without limitation, any claims, suits or proceedings for defamation or libel, violation of right of privacy or publicity, criminal investigations, infringement of intellectual property, false or deceptive advertising or sales practices and any virus, contaminating or destructive features. Telephone Conversations. 
                        </p>
                        <p>
                            All telephone conversations between you and us about your advertising may be recorded and you hereby consent to such monitoring and recordation. Arbitration: Any disputes and differences whatsoever arising in connection with these Terms shall be settled by Arbitration in accordance with the Arbitration and Conciliation Act, 1996. a) All proceedings shall be conducted in English language. b) Unless the Parties agree on a sole arbitrator there shall be three Arbitrators, one to be selected by each of the parties, and the third to be selected by the two Arbitrators appointed by the parties. c) The venue of Arbitration shall be in Visakhapatnam, Andhra Pradesh, India.
                        </p>
                        <p>
                            Entire Agreement. These Terms constitutes the entire agreement between you and us with respect to the subject matter of these Terms and supersedes all prior written and all prior or contemporaneous oral communications regarding such subject matter. Accordingly, you should not rely on any representations or warranties that are not expressly set forth in these Terms. If any provision or provisions of these Terms shall be held to be invalid, illegal, unenforceable or in conflict with the law of any jurisdiction, the validity, legality and enforceability of the remaining provisions shall not in any way be affected or impaired. Except as provided in Section 1, these Terms may not be modified except by writing signed by you and us; provided, however, we may change these Terms from time to time, and such revised terms and conditions shall be effective with respect to any Advertising Products ordered after written notice of such revised terms to you or, if earlier, posting of such revised terms and conditions on our Website.
                        </p>
                        </div> 
                        <div className="mt-20">
                        <h4>XVII. END OF TERMS OF SERVICE</h4>
                        <p>
                            If you have any questions or concerns regarding this Agreement, please contact us at <a href="mailto:handymanserviceproviders@gmail.com.">handymanserviceproviders@gmail.com.</a>
                        </p>
                        </div>
                </div>
            </div>
            <div className = "text-center">
            <button className="btn btn-danger w-20" title="close" onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )} 

          <div style={{ width: '100%', textAlign: 'start', padding: '1rem' }}>
          <button
    type="submit"
    className={`responsive-login-btn ${submitted ? 'disabled' : ''}`}
    disabled={submitted}>
    {submitted ? 'Loading...' : 'Login'}
  </button>
    </div>
        </form>
      </div>
      {/* Styles for floating menu */}
<style jsx>{`
        .floating-menu {
          position: fixed;
          top: 80px; /* Increased from 20px to avoid overlapping with the logo */
          left: 20px; /* Adjusted for placement on the left side */
          z-index: 1000;
        }
        // .modal-overlay {
        //   position: fixed;
        //   top: 0;
        //   left: 0;
        //   width: 110%;
        //   height: 110%;
        //   background: rgba(0, 0, 0, 0.5);
        //   display: flex;
        //   justify-content: center;
        //   align-items: center;
        //   z-index: 1000;
        // }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 20px;
          width: 100%;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          text-align: left;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;