import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Registration from '../pages/registrationPage/Registration';
// import ChangePassword from '../pages/changespassword/ChangePassword';
import Login from '../pages/login/Login';
import UserProfile from '../pages/userprofile';
// import TaskPage from '../pages/taskpage/TaskPage';
import ForgetPassword from '../pages/forgetPassword/ForgetPassword';
import NotFound from '../components/NotFound';
import Dashboard from '../pages/dashboard';
import Event from '../pages/event/Event';
import LayoutSideBar from '../layout/LayoutSideBar';
// import TermAndCondition from '../pages/TermsAndConditons';
import Member from '../pages/member/Member';
import Error from '../components/Error';
import AdminDashboard from '../pages/adminDashboard/AdminDashboard';
import PendingRequest from '../pages/pendingRequest/PendingRequest';
import RequestDeclined from '../pages/requestDeclined/RequestDeclined';
import PendingApproval from '../pages/pendingApproval/PendingApproval';
import Teams from '../pages/team/Team';
import Conversations from '../pages/conversations/Conversations';
import PlayerEvaluation from '../pages/evaluation/playerevaluation';
import PlayerReport from '../pages/report/PlayerReport';
import CreateTeamPage from '../pages/team/CreateTeamPage';

const Routers = () => {
  return (
    <div>
      <Router>
        <Routes>
          {/* <Route path="/dashboard/project/:userId/:projectId/tasks/:projectName" element={<LayoutSideBar currentPage="Task"><TaskPage /></LayoutSideBar>} /> */}
          <Route path="/members/:userId" element={<LayoutSideBar currentPage="Member" ><Member /></LayoutSideBar>} />
          <Route path="/dashboard/:userId" element={<LayoutSideBar currentPage="Dashboard"><Dashboard /></LayoutSideBar>} />
          <Route path="/dashboard/event/:userId" element={<LayoutSideBar currentPage="Events"><Event /></LayoutSideBar>} />
          <Route path="/project/user-profile" element={<UserProfile />} />
          <Route path="/forget-password" element={<ForgetPassword />} />
          <Route path="/" element={<Login />} />
          <Route path="/dashboard/teams/:userId" element={<LayoutSideBar currentPage="Teams"><Teams /></LayoutSideBar>} /> {/* New Teams route */}
          <Route 
  path="/dashboard/teams/create/:userId/:eventId" 
  element={<LayoutSideBar currentPage="Teams"><CreateTeamPage /></LayoutSideBar>} 
/>
          <Route path="/register" element={<Registration />} />
          {/* <Route path="/term-condition" element={<TermAndCondition />} /> */}
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/pending-request" element={<PendingRequest />} />
          <Route path="/request-declined" element={<RequestDeclined />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="*" element={<NotFound />} />
          <Route path="/dashboard/conversations/:userId" element={<LayoutSideBar currentPage="Conversations"><Conversations /></LayoutSideBar>} />
          <Route path="/dashboard/player-evaluation/:userId" element={<LayoutSideBar currentPage="PlayerEvaluation"><PlayerEvaluation /></LayoutSideBar>} />
          <Route path="/dashboard/player-report/:userId/:playerId" element={<LayoutSideBar currentPage="PlayerReport"><PlayerReport /></LayoutSideBar>} />
          <Route path="/error" element={<Error />} />
        </Routes>
      </Router>
    </div>
  );
};

export default Routers;