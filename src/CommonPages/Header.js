import React from "react";
import Logo from "../img/Hm_Logo 1.png";

const Header = () => {
  return (
    <header className="header d-flex">
      <img className="h-100" src={Logo} alt="Handy Man Logo" />
      <div className="spacer"></div>
    </header>
  );
};

export default Header;
