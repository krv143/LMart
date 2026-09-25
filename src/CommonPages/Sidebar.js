import React from "react";
import { Link } from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import StorefrontIcon from '@mui/icons-material/Storefront';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ApartmentIcon from '@mui/icons-material/Apartment';

import { useParams } from 'react-router-dom';
const Sidebar = () => {  
  const {userType} = useParams();
  const {userId} = useParams();
 
const menuConfig = {
    customer: [
      { MenuIcon: <DashboardIcon />, MenuTitle: "Dashboard", 
        TargetUrl: `/profilePage/${userType}/${userId}`},
      { MenuIcon: <SupportAgentIcon />, MenuTitle: "Raise Ticket", TargetUrl: `/raiseTicket/${userType}/${userId}` },
      { MenuIcon: <PersonAddIcon />, MenuTitle: "Book A Technician", TargetUrl: `/bookTechnician/${userType}/${userId}` },
      { MenuIcon: <StorefrontIcon />, MenuTitle: "Buy Products", TargetUrl: `/buyProducts/${userType}/${userId}` },
      { MenuIcon: <LocalOfferIcon />, MenuTitle: "Buy Product Offers", TargetUrl: `/offersIcons/${userType}/${userId}` },
      { MenuIcon: <ApartmentIcon />, MenuTitle: "Apartment Common Area Maintenance", TargetUrl: `/aboutApartmentRaiseTicket/${userType}/${userId}`}, 
    ],
  }; 

   const { userType: fallbackUserType } = useParams(); 
   const selectedUserType = userType || fallbackUserType;
  const menuList = menuConfig[selectedUserType] || [];

  return (
    <div>
        {menuList.map((menu, index) => (
          <div key={index}>
            <Link to={menu.TargetUrl}>
              <i className="_mnu_dv">
                {menu.MenuIcon} {menu.MenuTitle}
              </i>
            </Link>
          </div>
        ))}
    </div>
  );
};

const App = () => {
  
  const { selectedUserType } = useParams(); 

  return (
    <div className="d-flex flex-row justify-content-start align-items-start">
      <div className="m-0 p-0 sde_mnu">
        <Sidebar userType={selectedUserType} />
      </div>
    </div>
  );
};

export default App;

 