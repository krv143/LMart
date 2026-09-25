import React, { useState, useEffect } from 'react';
import ElectricalServicesIcon from '@mui/icons-material/ElectricalServices';
import PlumbingIcon from '@mui/icons-material/Plumbing';
import PestControlIcon from '@mui/icons-material/PestControl';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import Header from '../CommonPages/Header';
import Footer from '../CommonPages/Footer';
import { Dashboard as MoreVertIcon } from '@mui/icons-material';
import Sidebar from '../CommonPages/Sidebar';
import { Button} from 'react-bootstrap';
import {  useNavigate, useParams } from 'react-router-dom';
const AboutApartmentRaiseTicket = () => {
    const Navigate = useNavigate();
  const {userType} = useParams();
   const {userId} = useParams();
  const {selectedUserType} = useParams();
  const [isMobile, setIsMobile] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
    useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth <= 768);
      handleResize(); 
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

  return (
    <>
    <Header />
    <div className="mt-100 offer-banner text-center text-white py-2">
         <b className='mx-5'>Apartment Common Area Monthly Maintenance Plan</b>
      </div>
       <p className="mb-0 text-center fw-bold">
        Say Goodbye to Delays and Hassles! Our Monthly Maintenance Package Ensures Your Community Stays Clean, Functional, and Pest-Free – All in one Plan!
      </p>
      <div className="d-flex flex-row justify-content-start align-items-start">
       {/* Sidebar for larger screens */}
       {!isMobile && (
        <div className="ml-0 m-4 p-0 sde_mnu">
          <Sidebar userType={selectedUserType} />
        </div>
      )}
      {/* Floating menu for mobile */}
      {isMobile && (
        <div className="floating-menu">
          <Button
            variant="primary"
            className="rounded-circle shadow"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertIcon />
          </Button>
          {showMenu && (
              <div className="sidebar-container">
                <Sidebar userType={selectedUserType} />
              </div>
          )}
        </div>
      )} 
      {/* Main Content */}
      <div className={`apartment container ${isMobile ? 'w-100' : 'w-75'}`}>
      <div>
          <h5>
            <ElectricalServicesIcon className="w-5 h-5 mr-2" /> Electrical Maintenance
          </h5>
          <ul className="list-disc ml-7 text-gray-700">
            <li>Corridor & staircase lights, meter panel inspections</li>
            <li>Bulb/switch replacement</li>
          </ul>
            <h5><PlumbingIcon className="w-5 h-5 mt-0 mr-2" /> Plumbing Maintenance</h5>
          <ul className="list-disc mt-0 text-gray-700">
            <li>Leak repairs in tanks & pipes</li>
            <li>Drain blockages cleared, motors checked</li>
          </ul>
          <h5>
            <WaterDropIcon className="w-5 h-5 mr-2" /> Water Seepage Control
          </h5>
          <ul className="list-disc ml-7 text-gray-700">
            <li>Damp wall inspections & minor waterproofing</li>
          </ul>
          <h5>
            <PestControlIcon className="w-5 h-5 mr-2" /> Pest Control – 1 Spray
          </h5>
          <ul className="list-disc ml-7 text-gray-700">
            <li>Anti-cockroach & ant spray in all common areas</li>
            <li>Odorless, safe chemical used</li>
          </ul>
          <h5>
            <CleaningServicesIcon className="w-5 h-5 mr-2" /> Tank Cleaning – 1 Time
          </h5>
          <ul className="list-disc ml-7 text-gray-700">
            <li>Overhead & Sump tanks scrubbed and disinfected</li>
          </ul>
      </div>
      <div className="">💡 Materials charged extra if required</div>
        <div className="">💰 Just ₹200 per flat per month</div>
        <div className="">📥 Collected via Association</div>
        <div className="">🧑‍🔧 Includes Technician Visits & Labor</div>
     <div className="d-flex justify-content-between mt-2">  
  <button
    className="btn btn-success text-white btn-sm w-23 fs-6"
    onClick={() => Navigate(`/apartmentRaiseTicket/${userType}/${userId}`)}
  >
    📱 Raise Complaints
  </button>
<Button
    type="button"
    className="back-btn"
    onClick={() => Navigate(`/profilePage/${userType}/${userId}`)}
  >
    Back
  </Button>
</div>
<Footer />
    </div>
    </div>
</>
  )
};
export default AboutApartmentRaiseTicket
