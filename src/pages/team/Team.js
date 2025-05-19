import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, getDocs, doc, setDoc, updateDoc, deleteDoc,
  query, where, arrayUnion, addDoc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { 
  Button, Card, Table, Tag, Tabs, Select, 
  message, Empty, Modal, Form, Input, Spin, List,
  DatePicker, TimePicker, Space, Popover, Badge, Divider,
  Comment, Avatar, Tooltip, Dropdown, Menu, Checkbox
} from 'antd';
import { 
  TeamOutlined, UserOutlined, 
  PlusOutlined, TrophyOutlined,
  CalendarOutlined, ClockCircleOutlined,
  InfoCircleOutlined, SolutionOutlined,
  MessageOutlined, SendOutlined, MoreOutlined,
  EditOutlined, DeleteOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './team.css';

const { TabPane } = Tabs;
const { Option } = Select;
const { confirm } = Modal;

const Teams = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEventName, setSelectedEventName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [teams, setTeams] = useState([]);
  const navigate = useNavigate();
  const [userType, setUserType] = useState('');
  const [allUsers, setAllUsers] = useState({});
  const [playerTeams, setPlayerTeams] = useState([]);
  const [playerEvents, setPlayerEvents] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [editForm] = Form.useForm();

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

  // Handle event selection logic
  const handleEventSelect = async (eventId) => {
    if (!eventId) {
      clearEventSelection();
      return;
    }
    
    localStorage.setItem('selectedEventId', eventId);
    
    const event = events.find(e => e.id === eventId) || playerEvents.find(e => e.id === eventId);
    if (!event) {
      console.error('Selected event not found');
      return;
    }
    
    setSelectedEvent(event);
    setSelectedEventName(event.title);
    
    try {
      await fetchParticipants(event);
    } catch (error) {
      console.error('Error fetching participants:', error);
      message.error('Failed to load participants');
    }
  };

  // Separate function to fetch participants
  const fetchParticipants = async (event) => {
    if (!event || !event.participants || event.participants.length === 0) {
      setParticipants([]);
      return;
    }
    
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  };

  // Delete team function
  const handleDeleteTeam = async (teamId, teamName) => {
    confirm({
      title: 'Delete Team',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${teamName}"? This action cannot be undone.`,
      okText: 'Yes, Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await deleteDoc(doc(db, 'teams', teamId));
          
          // Refresh teams list
          const teamsQuery = query(collection(db, 'teams'), where('coachId', '==', userId));
          const teamsSnapshot = await getDocs(teamsQuery);
          const updatedTeams = [];
          teamsSnapshot.forEach((doc) => {
            updatedTeams.push({ id: doc.id, ...doc.data() });
          });
          setTeams(updatedTeams);
          
          message.success(`Team "${teamName}" deleted successfully`);
        } catch (error) {
          console.error('Error deleting team:', error);
          message.error('Failed to delete team');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Open edit modal
  const handleEditTeam = (team) => {
    setEditingTeam(team);
    editForm.setFieldsValue({
      name: team.name,
      participants: team.participants
    });
    setEditModalVisible(true);
  };

  // Save team edits
  const handleSaveTeamEdit = async (values) => {
    try {
      setLoading(true);
      const teamRef = doc(db, 'teams', editingTeam.id);
      
      await updateDoc(teamRef, {
        name: values.name,
        participants: values.participants,
        updatedAt: serverTimestamp()
      });

      // Refresh teams list
      const teamsQuery = query(collection(db, 'teams'), where('coachId', '==', userId));
      const teamsSnapshot = await getDocs(teamsQuery);
      const updatedTeams = [];
      teamsSnapshot.forEach((doc) => {
        updatedTeams.push({ id: doc.id, ...doc.data() });
      });
      setTeams(updatedTeams);

      message.success('Team updated successfully');
      setEditModalVisible(false);
      setEditingTeam(null);
      editForm.resetFields();
    } catch (error) {
      console.error('Error updating team:', error);
      message.error('Failed to update team');
    } finally {
      setLoading(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingTeam(null);
    editForm.resetFields();
  };

  // Initial data loading
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
          
          let userEvents = [];
          let userTeams = [];
          
          if (currentUser.userType === 'player') {
            const playerTeamsQuery = query(collection(db, 'teams'), where('participants', 'array-contains', userId));
            const playerTeamsSnapshot = await getDocs(playerTeamsQuery);
            
            playerTeamsSnapshot.forEach((doc) => {
              userTeams.push({ id: doc.id, ...doc.data() });
            });
            
            setPlayerTeams(userTeams);
            
            const playerEventsQuery = query(collection(db, 'events'), where('participants', 'array-contains', userId));
            const playerEventsSnapshot = await getDocs(playerEventsQuery);
            
            playerEventsSnapshot.forEach((doc) => {
              userEvents.push({ id: doc.id, ...doc.data() });
            });
            
            setPlayerEvents(userEvents);
          } else if (currentUser.userType === 'coach') {
            const eventsQuery = query(collection(db, 'events'), where('coachId', '==', userId));
            const eventsSnapshot = await getDocs(eventsQuery);
            
            eventsSnapshot.forEach((doc) => {
              userEvents.push({ id: doc.id, ...doc.data() });
            });
            
            setEvents(userEvents);
            
            const teamsQuery = query(collection(db, 'teams'), where('coachId', '==', userId));
            const teamsSnapshot = await getDocs(teamsQuery);
            
            teamsSnapshot.forEach((doc) => {
              userTeams.push({ id: doc.id, ...doc.data() });
            });
            
            setTeams(userTeams);
          }
          
          setInitialLoadComplete(true);
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

  // Effect to restore selected event after initial data load
  useEffect(() => {
    const restoreSelectedEvent = async () => {
      if (!initialLoadComplete) return;
      
      const savedEventId = localStorage.getItem('selectedEventId');
      if (!savedEventId) return;
      
      const relevantEvents = userType === 'coach' ? events : playerEvents;
      const foundEvent = relevantEvents.find(e => e.id === savedEventId);
      
      if (foundEvent) {
        setSelectedEvent(foundEvent);
        setSelectedEventName(foundEvent.title);
        await fetchParticipants(foundEvent);
      }
    };
    
    restoreSelectedEvent();
  }, [initialLoadComplete, events, playerEvents, userType]);

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
          
          const teamActions = (
            <Menu>
              <Menu.Item 
                key="edit" 
                icon={<EditOutlined />}
                onClick={() => handleEditTeam(team)}
              >
                Edit Team
              </Menu.Item>
              <Menu.Item 
                key="delete" 
                icon={<DeleteOutlined />}
                danger
                onClick={() => handleDeleteTeam(team.id, team.name)}
              >
                Delete Team
              </Menu.Item>
            </Menu>
          );
          
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isIndividualSport ? (
                    <Tag color="gold">Individual Event</Tag>
                  ) : (
                    <Tag color="blue">Team of {team.participants.length}</Tag>
                  )}
                  <Dropdown overlay={teamActions} trigger={['click']}>
                    <Button type="text" icon={<MoreOutlined />} />
                  </Dropdown>
                </div>
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

  const clearEventSelection = () => {
    setSelectedEvent(null);
    setSelectedEventName('');
    localStorage.removeItem('selectedEventId');
    setParticipants([]);
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
              <div className="event-selector" style={{ marginBottom: '20px' }}>
                <h3>Select Event:</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Select
                    placeholder="Select an event"
                    style={{ width: 300 }}
                    onChange={handleEventSelect}
                    value={selectedEvent?.id}
                    allowClear
                  >
                    {playerEvents.map(event => (
                      <Option key={event.id} value={event.id}>
                        {event.title} ({event.gameType})
                      </Option>
                    ))}
                  </Select>
                  {selectedEvent && (
                    <Button type="link" onClick={clearEventSelection}>Clear Selection</Button>
                  )}
                </div>
                {selectedEventName && (
                  <div style={{ marginTop: '10px' }}>
                    <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                      Currently viewing: {selectedEventName}
                    </Tag>
                  </div>
                )}
              </div>
              
              {selectedEvent ? (
                <div style={{ marginTop: 20 }}>
                  <Table 
                    dataSource={participants} 
                    columns={getParticipantColumns()} 
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              ) : (
                <Empty description="Please select an event to view participants" />
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
          <div className="event-selector" style={{ marginBottom: '20px' }}>
            <h3>Select Event:</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Select
                placeholder="Select an event"
                style={{ width: 300 }}
                onChange={handleEventSelect}
                value={selectedEvent?.id}
                allowClear
              >
                {events.map(event => (
                  <Option key={event.id} value={event.id}>
                    {event.title} ({event.gameType})
                  </Option>
                ))}
              </Select>
              {selectedEvent && (
                <Button type="link" onClick={clearEventSelection}>Clear Selection</Button>
              )}
            </div>
            {selectedEventName && (
              <div style={{ marginTop: '10px' }}>
                <Tag color="blue" style={{ fontSize: '14px', padding: '4px 8px' }}>
                  Currently viewing: {selectedEventName}
                </Tag>
              </div>
            )}
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

          {/* Edit Team Modal */}
          <Modal
            title="Edit Team"
            visible={editModalVisible}
            onCancel={handleCancelEdit}
            footer={null}
            width={600}
          >
            <Form
              form={editForm}
              layout="vertical"
              onFinish={handleSaveTeamEdit}
            >
              <Form.Item
                name="name"
                label="Team Name"
                rules={[{ required: true, message: 'Please enter team name' }]}
              >
                <Input placeholder="Enter team name" />
              </Form.Item>

              <Form.Item
                name="participants"
                label="Team Members"
                rules={[{ required: true, message: 'Please select team members' }]}
              >
                <Checkbox.Group style={{ width: '100%' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '8px' }}>
                    {participants.map(participant => (
                      <Checkbox key={participant.id} value={participant.id}>
                        {participant.name} ({participant.email})
                      </Checkbox>
                    ))}
                  </div>
                </Checkbox.Group>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Save Changes
                  </Button>
                  <Button onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default Teams;