import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, getDocs, doc, setDoc, updateDoc, 
  query, where, arrayUnion, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { 
  Button, Card, Table, Tag, Tabs, Select, 
  message, Empty, Modal, Form, Input, Spin, List,
  DatePicker, TimePicker, Space, Popover, Badge, Divider,
  Comment, Avatar, Tooltip
} from 'antd';
import { 
  TeamOutlined, UserOutlined, 
  PlusOutlined, TrophyOutlined,
  CalendarOutlined, ClockCircleOutlined,
  InfoCircleOutlined, SolutionOutlined,
  MessageOutlined, SendOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './team.css';

const { TabPane } = Tabs;
const { Option } = Select;

const Teams = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();
  const [userType, setUserType] = useState('');
  const [allUsers, setAllUsers] = useState({});
  const [playerTeams, setPlayerTeams] = useState([]);
  const [playerEvents, setPlayerEvents] = useState([]);

  const teamSizeConfig = {
    'Football': 11,
    'Cricket': 11,
    'Basketball': 5,
    'Volleyball': 6,
    'Tennis': 2,
    'Badminton': 2,
    'Table Tennis': 2,
    'Swimming': 1
  };

  useEffect(() => {
    const fetchUserDataAndEvents = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = {};
        let currentUser = null;
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.uniqueId) {
            usersMap[userData.uniqueId] = {
              ...userData,
              email: doc.id,
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || doc.id
            };
          }
          
          if (userData.uniqueId === userId) {
            currentUser = { ...userData, email: doc.id };
          }
        });
        
        setAllUsers(usersMap);

        if (currentUser) {
          setUserType(currentUser.userType);
          
          if (currentUser.userType === 'player') {
            // Fetch teams where player is a participant
            const playerTeamsQuery = query(collection(db, 'teams'), where('participants', 'array-contains', userId));
            const playerTeamsSnapshot = await getDocs(playerTeamsQuery);
            const playerTeamsData = [];
            
            playerTeamsSnapshot.forEach((doc) => {
              playerTeamsData.push({ id: doc.id, ...doc.data() });
            });
            
            setPlayerTeams(playerTeamsData);
            
            // Fetch events player has joined
            const playerEventsQuery = query(collection(db, 'events'), where('participants', 'array-contains', userId));
            const playerEventsSnapshot = await getDocs(playerEventsQuery);
            const playerEventsData = [];
            
            playerEventsSnapshot.forEach((doc) => {
              playerEventsData.push({ id: doc.id, ...doc.data() });
            });
            
            setPlayerEvents(playerEventsData);
          } else if (currentUser.userType === 'coach') {
            // Fetch events created by coach
            const eventsQuery = query(collection(db, 'events'), where('coachId', '==', userId));
            const eventsSnapshot = await getDocs(eventsQuery);
            const coachEvents = [];
            
            eventsSnapshot.forEach((doc) => {
              coachEvents.push({ id: doc.id, ...doc.data() });
            });
            
            setEvents(coachEvents);
            
            // Fetch teams created by coach
            const teamsQuery = query(collection(db, 'teams'), where('coachId', '==', userId));
            const teamsSnapshot = await getDocs(teamsQuery);
            const coachTeams = [];
            
            teamsSnapshot.forEach((doc) => {
              coachTeams.push({ id: doc.id, ...doc.data() });
            });
            
            setTeams(coachTeams);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndEvents();
  }, [userId]);

  const handleEventSelect = async (eventId) => {
    const event = events.find(e => e.id === eventId) || playerEvents.find(e => e.id === eventId);
    setSelectedEvent(event);
    
    if (event && event.participants && event.participants.length > 0) {
      try {
        setLoading(true);
        // Fetch participant details
        const participantPromises = event.participants.map(async (participantId) => {
          const userQuery = query(collection(db, 'users'), where('uniqueId', '==', participantId));
          const querySnapshot = await getDocs(userQuery);
          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            return {
              key: participantId,
              id: participantId,
              name: `${userDoc.data().firstName || ''} ${userDoc.data().lastName || ''}`.trim() || userDoc.id,
              email: userDoc.id,
              games: userDoc.data().selectedGames || []
            };
          }
          return null;
        });

        const participantData = (await Promise.all(participantPromises)).filter(Boolean);
        setParticipants(participantData);
      } catch (error) {
        console.error('Error fetching participants:', error);
        message.error('Failed to load participants');
      } finally {
        setLoading(false);
      }
    } else {
      setParticipants([]);
    }
  };

  const getGameColor = (gameType) => {
    const colors = {
      'Football': 'green',
      'Cricket': 'blue',
      'Basketball': 'orange',
      'Volleyball': 'purple',
      'Tennis': 'lime',
      'Badminton': 'cyan',
      'Table Tennis': 'geekblue',
      'Swimming': 'blue'
    };
    
    return colors[gameType] || 'default';
  };

  const getPlayerDisplayName = (playerId) => {
    const participant = participants.find(p => p.id === playerId);
    if (participant && participant.name) {
      return participant.name;
    }
    
    if (allUsers[playerId]) {
      return allUsers[playerId].name || allUsers[playerId].email;
    }
    
    return allUsers[playerId]?.email || `Player ${playerId}`;
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: 'Not scheduled', time: '' };
    
    const matchDateTime = moment(dateTimeString);
    const date = matchDateTime.format('MMM DD, YYYY');
    const time = matchDateTime.format('hh:mm A');
    
    return { date, time };
  };

  const renderPlayerTeamsView = () => {
    if (playerTeams.length === 0) {
      return (
        <Empty 
          description="You haven't been assigned to any teams yet" 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="teams-grid">
        {playerTeams.map(team => {
          const { date, time } = formatDateTime(team.matchDateTime);
          const isIndividualSport = teamSizeConfig[team.gameType] === 1;
          
          return (
            <Card 
              key={team.id}
              className="team-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{team.name}</span>
                  <Tag color={getGameColor(team.gameType)}>
                    {team.gameType}
                  </Tag>
                </div>
              }
              extra={
                isIndividualSport && (
                  <Tag color="gold">Individual Event</Tag>
                )
              }
            >
              <p><TrophyOutlined /> Event: {team.eventName}</p>
              
              {team.matchDateTime && (
                <div className="match-info">
                  <CalendarOutlined /> Match Date: {date}
                  <ClockCircleOutlined style={{ marginLeft: 12 }} /> Time: {time}
                </div>
              )}
              
              <Divider orientation="left" plain>
                <TeamOutlined /> Team Information
              </Divider>
              
              {isIndividualSport ? (
                <div className="team-members">
                  <p><SolutionOutlined /> This is your individual participation in {team.gameType}</p>
                </div>
              ) : (
                <div className="team-members">
                  <h4>Team Members ({team.participants.length}):</h4>
                  <List
                    size="small"
                    dataSource={team.participants.map(id => ({
                      id,
                      name: getPlayerDisplayName(id)
                    }))}
                    renderItem={player => (
                      <List.Item key={player.id}>
                        <UserOutlined style={{ marginRight: 8 }} /> 
                        {player.name} 
                        {player.id === userId && (
                          <Tag color="blue" style={{ marginLeft: 8 }}>You</Tag>
                        )}
                      </List.Item>
                    )}
                  />
                </div>
              )}
              
              <Divider orientation="left" plain>
                <UserOutlined /> Coach Information
              </Divider>
              <div className="team-coach-info">
                <p><strong>Coach:</strong> {allUsers[team.coachId]?.name || 'Unknown Coach'}</p>
                <p><strong>Contact:</strong> {allUsers[team.coachId]?.email || 'Not available'}</p>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const getParticipantColumns = () => {
    return [
      {
        title: 'Player',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
          <span>
            {text} 
            {record.id === userId && <Tag color="blue" style={{ marginLeft: 8 }}>You</Tag>}
          </span>
        ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
      },
    
      {
        title: 'Games',
        dataIndex: 'games',
        key: 'games',
        render: (games) => (
          <>
            {games.map((game) => (
              <Tag color={getGameColor(game)} key={game}>
                {game}
              </Tag>
            ))}
          </>
        ),
      }
    ];
  };

  const renderCoachTeamsView = () => {
    const filteredTeams = selectedEvent 
      ? teams.filter(team => team.eventId === selectedEvent.id)
      : teams;

    if (filteredTeams.length === 0) {
      return <Empty description="No teams created yet" />;
    }

    return (
      <div className="teams-grid">
        {filteredTeams.map(team => {
          const { date, time } = formatDateTime(team.matchDateTime);
          const isIndividualSport = teamSizeConfig[team.gameType] === 1;
          
          return (
            <Card 
              key={team.id}
              className="team-card"
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{team.name}</span>
                  <Tag color={getGameColor(team.gameType)}>
                    {team.gameType}
                  </Tag>
                </div>
              }
              extra={
                isIndividualSport ? (
                  <Tag color="gold">Individual Event</Tag>
                ) : (
                  <Tag color="blue">Team of {team.participants.length}</Tag>
                )
              }
            >
              <p><TrophyOutlined /> Event: {team.eventName}</p>
              
              {team.matchDateTime && (
                <div className="match-info">
                  <CalendarOutlined /> Match Date: {date}
                  <ClockCircleOutlined style={{ marginLeft: 12 }} /> Time: {time}
                </div>
              )}
              
              <Divider orientation="left" plain>
                <TeamOutlined /> {isIndividualSport ? 'Participant' : 'Team Members'}
              </Divider>
              
              <List
                size="small"
                dataSource={team.participants.map(id => ({
                  id,
                  name: getPlayerDisplayName(id)
                }))}
                renderItem={player => (
                  <List.Item key={player.id}>
                    <UserOutlined style={{ marginRight: 8 }} /> 
                    {player.name}
                  </List.Item>
                )}
              />
            </Card>
          );
        })}
      </div>
    );
  };

  if (userType === 'player') {
    return (
      <div className="teams-container">
        <div className="teams-header">
          <h1>My Teams</h1>
        </div>
        
        <Tabs defaultActiveKey="teams">
          <TabPane tab="My Teams" key="teams">
            {loading ? (
              <div className="loading-container">
                <Spin size="large" />
                <p>Loading your teams...</p>
              </div>
            ) : (
              renderPlayerTeamsView()
            )}
          </TabPane>
          
          {playerEvents.length > 0 && (
            <TabPane tab="Event Participation" key="participation">
              <div className="event-selector">
                <h3>Select Event:</h3>
                <Select
                  placeholder="Select an event"
                  style={{ width: 300 }}
                  onChange={handleEventSelect}
                  allowClear
                >
                  {playerEvents.map(event => (
                    <Option key={event.id} value={event.id}>
                      {event.title} ({event.gameType})
                    </Option>
                  ))}
                </Select>
              </div>
              
              {selectedEvent && (
                <div style={{ marginTop: 20 }}>
                  <Table 
                    dataSource={participants} 
                    columns={getParticipantColumns()} 
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )}
            </TabPane>
          )}
        </Tabs>
      </div>
    );
  }

  if (userType !== 'coach') {
    return (
      <div className="teams-container">
        <div className="teams-header">
          <h1>Teams</h1>
        </div>
        <div className="access-denied">
          <Empty 
            description="Only coaches can access the teams management page" 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="teams-container">
      <div className="teams-header">
        <h1>Teams Management</h1>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spin size="large" />
          <p>Loading data...</p>
        </div>
      ) : (
        <>
          <div className="event-selector">
            <h3>Select Event:</h3>
            <Select
              placeholder="Select an event"
              style={{ width: 300 }}
              onChange={handleEventSelect}
              allowClear
            >
              {events.map(event => (
                <Option key={event.id} value={event.id}>
                  {event.title} ({event.gameType})
                </Option>
              ))}
            </Select>
          </div>

          <Tabs defaultActiveKey="participants" className="teams-tabs">
            <TabPane tab="Participants" key="participants">
              {selectedEvent ? (
                <>
                  <div className="section-header">
                    <h2>Participants for {selectedEvent.title}</h2>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={() => navigate(`/dashboard/teams/create/${userId}/${selectedEvent.id}`)}
                      disabled={participants.length === 0}
                    >
                      Create Team
                    </Button>
                  </div>
                  
                  {participants.length > 0 ? (
                    <Table 
                      dataSource={participants} 
                      columns={getParticipantColumns()} 
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  ) : (
                    <Empty description="No participants have joined this event yet" />
                  )}
                </>
              ) : (
                <Empty description="Please select an event to view participants" />
              )}
            </TabPane>
            
            <TabPane tab="Teams" key="teams">
              <div className="section-header">
                <h2>
                  {selectedEvent 
                    ? `Teams for ${selectedEvent.title}` 
                    : 'All Teams'}
                </h2>
              </div>
              {renderCoachTeamsView()}
            </TabPane>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Teams;