import React, {useEffect, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import '../App.css';
import HandyManCharacter from "../img/hm_char.png";
import HandyManLogo from "../img/Hm_Logo 1.png";

const LandingPage = () => {

  const wordRefs = useRef([]);

  useEffect(() => {
    wordRefs.current.forEach((word, index) => {
      setTimeout(() => {
        if (word) word.classList.add('show');
      }, index * 1000);
    });

    const totalDuration = wordRefs.current.length * 1500;
    const redirectTimeout = setTimeout(() => {
      window.location.href = '/loginnew';
    }, totalDuration);
    return () => clearTimeout(redirectTimeout);
  }, []);

  return (
   <div className="landing_page h-90 d-flex align-items-center py-2 flex-column mt-2">
  <div className="spacer"></div>
  <div className="w-auto p-4 text-center">
    <div className="container">
      <div className="row">
        <div className="col">
          <img 
            src={HandyManCharacter} 
            alt="Character" 
            width="200" 
            height="200" 
            className="img-fluid"
          />
        </div>
      </div>
      <div className="row">
        <div className="col">
          <img 
            src={HandyManLogo} 
            alt="Logo" 
            width="190" 
            height="90" 
            className="img-fluid"
          />
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div id="ldr_txt" className="gry_fnt py-2">
            <div ref={el => wordRefs.current[0] = el} className="word">• Your Home</div>
            <div ref={el => wordRefs.current[1] = el} className="word">• Your Needs</div>
            <div ref={el => wordRefs.current[2] = el} className="word">• Our Solutions </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div className="spacer"></div>
</div>
  );
};

export default LandingPage;