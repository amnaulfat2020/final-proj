import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  UserOutlined, FileOutlined, LogoutOutlined, 
  TeamOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
  UsergroupAddOutlined, MessageOutlined, FormOutlined
} from '@ant-design/icons';
import { Menu, Button, Badge } from 'antd';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../utils/constants/Firebase'; // Added auth import
import { signOut } from 'firebase/auth'; // Added signOut import
import './sidebar.css';
import logo from '../../assets/images/side-logo.png';
import SideImg from '../../assets/images/hamburger.png';
import LeftImg from '../../assets/images/hamburger1.png';

function getItem(label, key, icon, children, type) {
  return {
    key,
    icon,
    children,
    label,
    type,
  };
}

const Sidebar = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const unreadQuery = query(
          collection(db, 'users', userId, 'unreadMessages'),
          where('unread', '==', true)
        );
        const unreadSnapshot = await getDocs(unreadQuery);
        
        let totalUnread = 0;
        unreadSnapshot.forEach((doc) => {
          totalUnread += doc.data().count || 1;
        });
        
        setUnreadCount(totalUnread);
      } catch (error) {
        console.error('Error fetching unread messages:', error);
      }
    };

    // Fetch initially
    fetchUnreadMessages();
    
    // Set up real-time updates (optional)
    const interval = setInterval(fetchUnreadMessages, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [userId]);

  const handleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  const items = [
    getItem('Dashboard', 'sub1', <UserOutlined />, null, 'item'),
    { type: 'divider' },
    getItem('Events', 'sub2', <FileOutlined />, null, 'item'),
    { type: 'divider' },
    getItem('Teams', 'sub3', <TeamOutlined />, null, 'item'),
    { type: 'divider' },
    getItem('Player Evaluation', 'sub6', <FormOutlined />, null, 'item'),
    { type: 'divider' }, 
    getItem('Members', 'sub4', <UsergroupAddOutlined />, null, 'item'),
    { type: 'divider' },
    getItem(
      <Badge dot={unreadCount > 0}>Conversations</Badge>, 
      'sub5', 
      // <Badge dot={unreadCount > 0}>
        <MessageOutlined />
      // </Badge>
    ),
    { type: 'divider' },
  ];

  const onClick = (e) => {
    console.log('click ', e);
  };

  return (
    <div className={`side-bar ${collapsed ? 'collapsed' : ''}`}>
      <div className="logo-container">
        <img src={logo} alt="logo" className={`logo ${collapsed ? 'collapsed-logo' : ''}`} />
        <div onClick={handleCollapse}>
          {collapsed ? <img src={SideImg} alt='side-img' className='w-50 colaps-img cursor' />
            : <img src={LeftImg} alt='LeftImg' className='w-50  mr-10 cursor' />}
        </div>
      </div>
      <div className='mt-100 b-top b-bottom'>
        <Menu
          onClick={onClick}
          style={{ width: collapsed ? 100 : "100%" }}
          defaultSelectedKeys={['1']}
          defaultOpenKeys={['sub1']}
          mode="inline"
          items={items}
          onSelect={({ key }) => {
            if (key === 'sub1') navigate(`/dashboard/${userId}`);
            if (key === 'sub2') navigate(`/dashboard/event/${userId}`);
            if (key === 'sub3') navigate(`/dashboard/teams/${userId}`);
            if (key === 'sub4') navigate(`/members/${userId}`);
            if (key === 'sub6') navigate(`/dashboard/player-evaluation/${userId}`);
            if (key === 'sub5') navigate(`/dashboard/conversations/${userId}`);
          }}
          inlineCollapsed={collapsed}
        />
      </div>

      {collapsed ? (
        <Button className="sidebar-btn" onClick={handleLogout}>
          <LogoutOutlined />
        </Button>
      ) : (
        <Button className="sidebar-btn" onClick={handleLogout}>
          <LogoutOutlined /> Logout
        </Button>
      )}
    </div>
  );
};

export default Sidebar;