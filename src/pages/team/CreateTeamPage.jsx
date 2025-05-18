import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Button, Card, Table, Tag, Select, 
  message, Form, Input, DatePicker, 
  TimePicker, List, Divider, Typography, 
  Row, Col, Avatar, Badge, Spin, Empty, Alert
} from 'antd';
import { 
  TeamOutlined, UserOutlined, PlusOutlined, 
  TrophyOutlined, CalendarOutlined, 
  ClockCircleOutlined, ArrowLeftOutlined 
} from '@ant-design/icons';
import moment from 'moment';
import { db } from '../../utils/constants/Firebase';
import { collection, getDocs, query, where, doc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const { Title } = Typography;
const { Option } = Select;

const CreateTeamPage = () => {
  const { userId, eventId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [form] = Form.useForm();
  const [allUsers, setAllUsers] = useState({});

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
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all users for participant lookup
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = {};
        
        usersSnapshot.forEach(doc => {
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
        
        // Fetch all events for this coach
        const eventsQuery = query(collection(db, 'events'), where('coachId', '==', userId));
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = [];
        
        eventsSnapshot.forEach(doc => {
          eventsData.push({ 
            id: doc.id, 
            ...doc.data(),
            participants: doc.data().participants || []
          });
        });
        
        setEvents(eventsData);
        
        // If eventId is provided in URL, select it automatically
        if (eventId && eventsData.length > 0) {
          const preselectedEvent = eventsData.find(e => e.id === eventId);
          if (preselectedEvent) {
            setSelectedEvent(preselectedEvent);
            await loadParticipants(preselectedEvent, usersMap);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, eventId]);

  const loadParticipants = async (event, usersMap = allUsers) => {
    if (!event || !event.participants || event.participants.length === 0) {
      setParticipants([]);
      setTeamMembers([]);
      return;
    }

    try {
      setLoading(true);
      
      const participantData = event.participants
        .map(participantId => {
          const user = usersMap[participantId];
          if (user) {
            return {
              key: participantId,
              id: participantId,
              name: user.name,
              email: user.email,
              age: user.age || 'N/A',
              games: user.selectedGames || []
            };
          }
          return null;
        })
        .filter(Boolean);

      setParticipants(participantData);
      setTeamMembers([]);
    } catch (error) {
      console.error('Error loading participants:', error);
      message.error('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (eventId) => {
    const event = events.find(e => e.id === eventId);
    setSelectedEvent(event);
    setTeamMembers([]);
    
    if (event) {
      await loadParticipants(event);
      navigate(`/dashboard/teams/create/${userId}/${eventId}`);
    } else {
      navigate(`/dashboard/teams/create/${userId}`);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // Same position
    if (source.droppableId === destination.droppableId && 
        source.index === destination.index) {
      return;
    }

    const requiredTeamSize = selectedEvent ? teamSizeConfig[selectedEvent.gameType] || 2 : 2;

    // Moving from participants to team
    if (source.droppableId === 'participants' && destination.droppableId === 'team') {
      if (teamMembers.length >= requiredTeamSize) {
        message.warning(`This team can only have ${requiredTeamSize} players`);
        return;
      }

      const newParticipants = Array.from(participants);
      const [removed] = newParticipants.splice(source.index, 1);
      setParticipants(newParticipants);

      const newTeamMembers = Array.from(teamMembers);
      newTeamMembers.splice(destination.index, 0, removed);
      setTeamMembers(newTeamMembers);
    }
    // Moving from team to participants
    else if (source.droppableId === 'team' && destination.droppableId === 'participants') {
      const newTeamMembers = Array.from(teamMembers);
      const [removed] = newTeamMembers.splice(source.index, 1);
      setTeamMembers(newTeamMembers);

      const newParticipants = Array.from(participants);
      newParticipants.splice(destination.index, 0, removed);
      setParticipants(newParticipants);
    }
    // Reordering within the same list
    else if (source.droppableId === destination.droppableId) {
      const list = source.droppableId === 'participants' ? participants : teamMembers;
      const newList = Array.from(list);
      const [removed] = newList.splice(source.index, 1);
      newList.splice(destination.index, 0, removed);

      if (source.droppableId === 'participants') {
        setParticipants(newList);
      } else {
        setTeamMembers(newList);
      }
    }
  };

  const handleCreateTeam = async () => {
    try {
      const values = await form.validateFields();
      const teamName = values.teamName;
      const matchDate = values.matchDate;
      const matchTime = values.matchTime;

      if (!selectedEvent) {
        message.error('Please select an event first');
        return;
      }

      if (teamMembers.length === 0) {
        message.error('Please add participants to the team');
        return;
      }

      const requiredTeamSize = teamSizeConfig[selectedEvent.gameType] || 2;
      if (teamMembers.length !== requiredTeamSize) {
        message.warning(`${selectedEvent.gameType} teams require exactly ${requiredTeamSize} players. You have ${teamMembers.length}.`);
        return;
      }

      const matchDateTime = matchDate.clone();
      matchDateTime.set({
        hour: matchTime.hour(),
        minute: matchTime.minute(),
        second: 0
      });

      const teamData = {
        name: teamName,
        eventId: selectedEvent.id,
        eventName: selectedEvent.title,
        gameType: selectedEvent.gameType,
        coachId: userId,
        participants: teamMembers.map(member => member.id),
        matchDateTime: matchDateTime.toISOString(),
        createdAt: new Date().toISOString()
      };

      const teamRef = doc(collection(db, 'teams'));
      await setDoc(teamRef, teamData);

      // Update player documents
      const updatePlayerPromises = teamMembers.map(async (member) => {
        const user = allUsers[member.id];
        if (user) {
          const userRef = doc(db, 'users', user.email);
          await updateDoc(userRef, {
            teams: arrayUnion({
              teamId: teamRef.id,
              teamName: teamName,
              eventId: selectedEvent.id,
              eventName: selectedEvent.title,
              gameType: selectedEvent.gameType,
              matchDateTime: matchDateTime.toISOString(),
              coachId: userId
            })
          });
        }
      });

      await Promise.all(updatePlayerPromises);

      message.success('Team created successfully!');
      navigate(`/dashboard/teams/${userId}`);
    } catch (error) {
      console.error('Error creating team:', error);
      message.error('Failed to create team');
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

  if (loading && events.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(`/dashboard/teams/${userId}`)}
        style={{ marginBottom: 16 }}
      >
        Back to Teams
      </Button>

      <Title level={2}>Create New Team</Title>
      <Divider />

      <Card style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <h3>Select Event:</h3>
          <Select
            placeholder="Select an event"
            style={{ width: '100%' }}
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
        </div>

        {selectedEvent ? (
          <div>
            <p><strong>Event:</strong> {selectedEvent.title}</p>
            <p><strong>Game Type:</strong> <Tag color={getGameColor(selectedEvent.gameType)}>{selectedEvent.gameType}</Tag></p>
            <p>
              <strong>Required Players:</strong> 
              {teamSizeConfig[selectedEvent.gameType] === 1 
                ? ' Individual participation' 
                : ` ${teamSizeConfig[selectedEvent.gameType] || 'Not specified'}`}
            </p>
          </div>
        ) : (
          <Alert 
            message="No event selected" 
            description="Please select an event to view participants and create a team" 
            type="info" 
            showIcon
          />
        )}
      </Card>

      {selectedEvent && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Row gutter={[24, 24]}>
            <Col span={24} md={12}>
              <Card 
                title={`Available Participants (${participants.length})`}
                loading={loading}
              >
                <Droppable droppableId="participants">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: '200px',
                        padding: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '4px'
                      }}
                    >
                      {participants.length > 0 ? (
                        participants.map((participant, index) => (
                          <Draggable 
                            key={participant.id} 
                            draggableId={participant.id} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  userSelect: 'none',
                                  padding: '12px',
                                  margin: '0 0 8px 0',
                                  backgroundColor: '#fff',
                                  border: '1px solid #d9d9d9',
                                  borderRadius: '4px',
                                  ...provided.draggableProps.style
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar 
                                    size="small" 
                                    icon={<UserOutlined />} 
                                    style={{ marginRight: 8, backgroundColor: '#1890ff' }} 
                                  />
                                  <div>
                                    <div>{participant.name}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      {participant.games.map(game => (
                                        <Tag color={getGameColor(game)} key={game} style={{ marginRight: 4, marginTop: 4 }}>
                                          {game}
                                        </Tag>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <Empty description="No participants available" />
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card>
            </Col>

            <Col span={24} md={12}>
              <Card 
                title={`Team Members (${teamMembers.length}/${teamSizeConfig[selectedEvent.gameType] || '?'})`}
                loading={loading}
              >
                <Droppable droppableId="team">
                  {(provided) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: '200px',
                        padding: '8px',
                        backgroundColor: '#f6ffed',
                        border: '1px dashed #b7eb8f',
                        borderRadius: '4px'
                      }}
                    >
                      {teamMembers.length > 0 ? (
                        teamMembers.map((member, index) => (
                          <Draggable 
                            key={member.id} 
                            draggableId={member.id} 
                            index={index}
                          >
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{
                                  userSelect: 'none',
                                  padding: '12px',
                                  margin: '0 0 8px 0',
                                  backgroundColor: '#fff',
                                  border: '1px solid #b7eb8f',
                                  borderRadius: '4px',
                                  ...provided.draggableProps.style
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar 
                                    size="small" 
                                    icon={<UserOutlined />} 
                                    style={{ marginRight: 8, backgroundColor: '#52c41a' }} 
                                  />
                                  <div>
                                    <div>{member.name}</div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                      {member.games.map(game => (
                                        <Tag color={getGameColor(game)} key={game} style={{ marginRight: 4, marginTop: 4 }}>
                                          {game}
                                        </Tag>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))
                      ) : (
                        <Empty description="Drag players here to add to team" />
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Team Details">
                <Form form={form} layout="vertical">
                  <Form.Item
                    name="teamName"
                    label="Team Name"
                    rules={[{ required: true, message: 'Please enter a team name' }]}
                  >
                    <Input placeholder="Enter team name" />
                  </Form.Item>

                  <Divider orientation="left">Match Schedule</Divider>

                  <Form.Item
                    name="matchDate"
                    label="Date"
                    rules={[{ required: true, message: 'Please select match date' }]}
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      disabledDate={(current) => current && current < moment().startOf('day')}
                    />
                  </Form.Item>

                  <Form.Item
                    name="matchTime"
                    label="Time"
                    rules={[{ required: true, message: 'Please select match time' }]}
                  >
                    <TimePicker 
                      style={{ width: '100%' }}
                      format="h:mm A" 
                      use12Hours 
                    />
                  </Form.Item>

                  <Divider />

                  <Button 
                    type="primary" 
                    block
                    size="large"
                    onClick={handleCreateTeam}
                    disabled={teamMembers.length === 0}
                    icon={<TeamOutlined />}
                  >
                    Create Team
                  </Button>
                </Form>
              </Card>
            </Col>
          </Row>
        </DragDropContext>
      )}
    </div>
  );
};

export default CreateTeamPage;