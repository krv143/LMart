import React from "react";

const Footer = () => {      
  return (
    <footer className="footer" style={{fontSize: "12px"}}>
     <strong> Powered by</strong> <span className="text-warning strong">Lakshmi Sai Service Provider</span>
      <br />
      <span className="small">&copy; 2026 Lakshmi software development center. All rights reserved.</span> <br/>
       <span className="small">
        <strong> Office Hours :</strong> 07:00 AM-09:00 PM
      </span>   
      <br />  
      <span className="small">
        {" "}
        <strong>Customer Care :</strong> 6281198953
      </span>
    </footer>
  );
};

export default Footer;
        