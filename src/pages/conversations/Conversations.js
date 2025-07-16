import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, query, where, getDocs, doc, getDoc, setDoc, 
  serverTimestamp, orderBy, addDoc, onSnapshot 
} from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { 
  List, Avatar, Badge, Button, Card, Divider, Input, Space, 
  Tooltip, Typography, Tabs, Tag, message 
} from 'antd';
import { 
  MessageOutlined, SendOutlined, TeamOutlined, 
  UserOutlined, TrophyOutlined 
} from '@ant-design/icons';
import moment from 'moment';
import './Conversations.css';

const { Text } = Typography;
const { TabPane } = Tabs;

const Message = ({ author, avatar, content, datetime, isCurrentUser }) => {
  return (
    <div className={`message ${isCurrentUser ? 'current-user' : 'other-user'}`}>
      <Avatar src={avatar} icon={<UserOutlined />} className="message-avatar" />
      <div className="message-content-container">
        <div className="message-author">
          <Text strong>{author}</Text>
        </div>
        <Card className="message-bubble">
          {content}
        </Card>
        <div className="message-time">
          <Text type="secondary" className="time-text">{datetime}</Text>
        </div>
      </div>
    </div>
  );
};

const Conversations = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [coaches, setCoaches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [activeTab, setActiveTab] = useState('coaches');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [allUsers, setAllUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [totalUnread, setTotalUnread] = useState(0);

  // Fetch all users data and conversation participants
  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = {};
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.uniqueId) {
            usersMap[userData.uniqueId] = {
              ...userData,
              email: doc.id,
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || doc.id
            };
          }
        });
        
        setAllUsers(usersMap);
        const currentUser = usersMap[userId];
        if (!currentUser) return;

        // Get all events the user is part of
        let eventsQuery;
        if (currentUser.userType === 'player') {
          eventsQuery = query(collection(db, 'events'), where('participants', 'array-contains', userId));
        } else {
          eventsQuery = query(collection(db, 'events'), where('coachId', '==', userId));
        }
        
        const eventsSnapshot = await getDocs(eventsQuery);
        
        // Get all participants from these events
        const participantIds = new Set();
        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data();
          if (eventData.participants) {
            eventData.participants.forEach(id => {
              if (id !== userId) participantIds.add(id);
            });
          }
        }

        // For players, get coaches from their teams AND from their selected games
        if (currentUser.userType === 'player') {
          // Get coaches from teams (existing logic)
          const teamsQuery = query(collection(db, 'teams'), where('participants', 'array-contains', userId));
          const teamsSnapshot = await getDocs(teamsQuery);
          
          const teamCoachIds = new Set();
          teamsSnapshot.forEach((doc) => {
            const teamData = doc.data();
            if (teamData.coachId) teamCoachIds.add(teamData.coachId);
          });

          // NEW: Get coaches based on player's selected games during registration
          const gameCoachIds = new Set();
          if (currentUser.selectedGames && currentUser.selectedGames.length > 0) {
            const coachesQuery = query(
              collection(db, 'users'),
              where('userType', '==', 'coach'),
              where('status', '==', 'approved'),
              where('selectedGames', 'array-contains-any', currentUser.selectedGames)
            );
            const coachesSnapshot = await getDocs(coachesQuery);
            
            coachesSnapshot.forEach((doc) => {
              const coachData = doc.data();
              if (coachData.uniqueId) {
                gameCoachIds.add(coachData.uniqueId);
              }
            });
          }

          // Combine both team coaches and game-based coaches
          const allCoachIds = new Set([...teamCoachIds, ...gameCoachIds]);
          
          setCoaches(Array.from(allCoachIds).map(id => ({
            id,
            ...usersMap[id],
            type: 'coach'
          })).filter(coach => coach.firstName)); // Filter out any coaches that don't exist in usersMap
        }

        // Get actual teammates (from same teams) if player
        const teammateIds = new Set();
        if (currentUser.userType === 'player') {
          const teamsQuery = query(collection(db, 'teams'), where('participants', 'array-contains', userId));
          const teamsSnapshot = await getDocs(teamsQuery);
          
          teamsSnapshot.forEach((doc) => {
            const teamData = doc.data();
            teamData.participants.forEach(participantId => {
              if (participantId !== userId) teammateIds.add(participantId);
            });
          });
        }

        // Set all participants with teammate status
        const participantsList = Array.from(participantIds)
          .filter(id => usersMap[id])
          .map(id => ({
            id,
            ...usersMap[id],
            type: 'participant',
            isTeammate: teammateIds.has(id)
          }));
          
        setParticipants(participantsList);

      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Real-time listener for unread messages
  useEffect(() => {
    if (!userId) return;

    const unreadQuery = query(
      collection(db, 'users', userId, 'unreadMessages'),
      where('unread', '==', true)
    );
    
    const unsubscribe = onSnapshot(unreadQuery, (snapshot) => {
      const counts = {};
      let total = 0;
      
      snapshot.forEach((doc) => {
        counts[doc.id] = doc.data().count || 1;
        total += counts[doc.id];
      });
      
      setUnreadCounts(counts);
      setTotalUnread(total);
      
      // Update the document title with unread count
      document.title = total > 0 ? `(${total}) Conversations` : 'Conversations';
    });

    return () => unsubscribe();
  }, [userId]);

  const loadMessages = async (otherUserId) => {
    try {
      setLoading(true);
      setSelectedUser(otherUserId);
      
      const conversationId = [userId, otherUserId].sort().join('_');
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('timestamp', 'asc'));
      const messagesSnapshot = await getDocs(messagesQuery);
      
      const loadedMessages = [];
      messagesSnapshot.forEach((doc) => {
        loadedMessages.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        });
      });
      
      setMessages(loadedMessages);
      
      // Mark messages as read
      const unreadRef = doc(db, 'users', userId, 'unreadMessages', otherUserId);
      await setDoc(unreadRef, { unread: false, count: 0 }, { merge: true });
      
    } catch (error) {
      console.error('Error loading messages:', error);
      message.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUser) return;
    
    try {
      setLoading(true);
      
      const conversationId = [userId, selectedUser].sort().join('_');
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      await addDoc(messagesRef, {
        senderId: userId,
        text: newMessage,
        timestamp: serverTimestamp()
      });
      
      // Update the recipient's unread count
      const otherUserUnreadRef = doc(db, 'users', selectedUser, 'unreadMessages', userId);
      const otherUserUnreadSnap = await getDoc(otherUserUnreadRef);
      
      const currentCount = otherUserUnreadSnap.exists() ? otherUserUnreadSnap.data().count || 0 : 0;
      await setDoc(otherUserUnreadRef, {
        unread: true,
        count: currentCount + 1
      }, { merge: true });
      
      // Update local state
      setMessages(prev => [
        ...prev,
        {
          senderId: userId,
          text: newMessage,
          timestamp: new Date()
        }
      ]);
      
      setNewMessage('');
      
    } catch (error) {
      console.error('Error sending message:', error);
      message.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const renderUserList = (users) => (
    <List
      loading={loading}
      dataSource={users}
      renderItem={user => (
        <List.Item 
          key={user.id}
          onClick={() => loadMessages(user.id)}
          className={`user-list-item ${selectedUser === user.id ? 'selected' : ''}`}
        >
          <List.Item.Meta
            avatar={
              <Badge count={unreadCounts[user.id] || 0}>
                <Avatar src={user.photoURL} icon={<UserOutlined />} />
              </Badge>
            }
            title={
              <div className="user-title">
                <span>{user.name}</span>
                {user.isTeammate && <Tag color="green" style={{ marginLeft: 8 }}>Teammate</Tag>}
                {user.selectedGames?.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>{user.selectedGames[0]}</Tag>
                )}
              </div>
            }
            description={user.email}
          />
        </List.Item>
      )}
    />
  );

  return (
    <div className="conversations-container">
      <Card title="Conversations" loading={loading} className="users-card">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {coaches.length > 0 && (
            <TabPane
              tab={
                <span>
                  <UserOutlined /> Coaches
                  {coaches.some(c => unreadCounts[c.id]) && (
                    <Badge dot className="unread-badge" />
                  )}
                </span>
              }
              key="coaches"
            >
              {renderUserList(coaches)}
            </TabPane>
          )}
          
          <TabPane
            tab={
              <span>
                <TeamOutlined /> Participants
                {participants.some(p => unreadCounts[p.id]) && (
                  <Badge dot className="unread-badge" />
                )}
              </span>
            }
            key="participants"
          >
            {renderUserList(participants)}
          </TabPane>
        </Tabs>
      </Card>
      
      <div className="message-container">
        {selectedUser ? (
          <Card
            title={
              <div className="conversation-title">
                {allUsers[selectedUser]?.name || 'User'} 
                {allUsers[selectedUser]?.isTeammate && (
                  <Tag color="green" style={{ marginLeft: 8 }}>Teammate</Tag>
                )}
                {allUsers[selectedUser]?.selectedGames?.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {allUsers[selectedUser].selectedGames[0]}
                  </Tag>
                )}
              </div>
            }
            loading={loading}
            className="conversation-card"
          >
            <div className="messages-list">
              {messages.length > 0 ? (
                messages.map((msg, index) => (
                  <Message
                    key={index}
                    author={allUsers[msg.senderId]?.name || 'Unknown'}
                    avatar={allUsers[msg.senderId]?.photoURL}
                    content={<p className="message-text">{msg.text}</p>}
                    datetime={
                      <Tooltip title={moment(msg.timestamp).format('YYYY-MM-DD HH:mm:ss')}>
                        <span>{moment(msg.timestamp).fromNow()}</span>
                      </Tooltip>
                    }
                    isCurrentUser={msg.senderId === userId}
                  />
                ))
              ) : (
                <div className="no-messages">
                  <Text type="secondary">No messages yet. Start the conversation!</Text>
                </div>
              )}
            </div>
            
            <Divider className="message-divider" />
            
            <Space.Compact className="message-input-container">
              <Input
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onPressEnter={sendMessage}
                className="message-input"
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="send-button"
              >
                Send
              </Button>
            </Space.Compact>
          </Card>
        ) : (
          <Card className="empty-conversation-card">
            <div className="empty-conversation">
              <MessageOutlined className="empty-icon" />
              <p className="empty-text">
                Select a user to start chatting
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Conversations;