import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../utils/constants/Firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Avatar, Typography, Spin, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import UserImg from '../assets/images/OIP.jpeg';
import headerStyles from '../styles/headerStyles';
import UserProfilePopup from '../pages/userprofile/index';
// import './userprofile.css'; // Make sure this path is correct

const { Title } = Typography;

const MenuBar = ({ currentPage, projectTitle }) => {
    const [showProfilePopup, setShowProfilePopup] = useState(false);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUserData = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                const userRef = doc(db, 'users', user.email);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                    setUserData({ 
                        ...userDoc.data(), 
                        email: user.email 
                    });
                } else {
                    // Handle case where user document doesn't exist
                    setUserData({
                        email: user.email,
                        firstName: 'New',
                        lastName: 'User',
                        userType: 'player',
                        selectedGames: []
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            message.error('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchUserData();
            } else {
                setUserData(null);
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = () => {
        signOut(auth)
            .then(() => navigate('/'))
            .catch(console.error);
    };

    return (
        <div style={headerStyles.container}>
            <div style={headerStyles.leftSection}>
                <Title style={headerStyles.pageTitle}>
                    {currentPage}
                    {projectTitle && ` ${projectTitle}`}
                </Title>
            </div>
            
            <div style={headerStyles.rightSection}>
                {loading ? (
                    <Spin size="small" />
                ) : (
                    <Avatar 
                        src={UserImg}
                        icon={!UserImg && <UserOutlined />}
                        style={headerStyles.U_img}
                        onClick={() => setShowProfilePopup(true)}
                    >
                        {userData?.firstName?.charAt(0) || 'U'}
                    </Avatar>
                )}
            </div>

            {showProfilePopup && userData && (
                <UserProfilePopup 
                    userData={userData}
                    onClose={() => setShowProfilePopup(false)}
                    onUpdate={(updatedData) => {
                        setUserData(updatedData);
                        fetchUserData();
                    }}
                />
            )}
        </div>
    );
};

export default MenuBar;