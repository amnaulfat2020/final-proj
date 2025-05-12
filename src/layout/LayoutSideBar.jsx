import React, { useState } from "react";
import Sidebar from "../pages/sidebar/Sidebar";
import AppHeader from "../layout/MenuBar";
import "./LayoutSideBar.css";
import SessionTimeout from "../layout/SessionTimeout";

const LayoutSideBar = ({ children, currentPage }) => {
    const [loggedIn, setLoggedIn] = useState(true); 

    return (
        <div className="app-container">
            <Sidebar />
            <div className="content">
                {/* <AppHeader currentPage={currentPage} /> */}
                {currentPage !== "Task" && <AppHeader currentPage={currentPage} />}

                {children}
            </div>
            <SessionTimeout loggedIn={loggedIn} /> 
        </div>
    );
};

export default LayoutSideBar;
