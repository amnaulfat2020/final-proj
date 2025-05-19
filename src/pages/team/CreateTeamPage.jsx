import React, { useState, useEffect, useCallback } from 'react';
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
  ClockCircleOutlined, ArrowLeftOutlined,
  LockOutlined
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
  const [existingTeams, setExistingTeams] = useState([]);
  const [assignedParticipants, setAssignedParticipants] = useState(new Set());

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

  // Save state to localStorage
  const saveStateToLocalStorage = useCallback(() => {
    const state = {
      selectedEvent,
      teamMembers,
      formValues: form.getFieldsValue(),
      timestamp: Date.now()
    };
    localStorage.setItem(`createTeam_${userId}_${eventId || 'noEvent'}`, JSON.stringify(state));
  }, [selectedEvent, teamMembers, form, userId, eventId]);

  // Load state from localStorage
  const loadStateFromLocalStorage = useCallback(() => {
    const savedState = localStorage.getItem(`createTeam_${userId}_${eventId || 'noEvent'}`);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Check if state is not too old (1 hour)
        if (Date.now() - state.timestamp < 3600000) {
          return state;
        }
      } catch (error) {
        console.error('Error parsing saved state:', error);
      }
    }
    return null;
  }, [userId, eventId]);

  // Clear saved state
  const clearSavedState = useCallback(() => {
    localStorage.removeItem(`createTeam_${userId}_${eventId || 'noEvent'}`);
  }, [userId, eventId]);

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
            await fetchExistingTeams(eventId);
            await loadParticipants(preselectedEvent, usersMap, eventId);
          }
        }

        // Load saved state after initial data is loaded
        const savedState = loadStateFromLocalStorage();
        if (savedState) {
          if (savedState.selectedEvent && (!eventId || savedState.selectedEvent.id === eventId)) {
            setSelectedEvent(savedState.selectedEvent);
            if (savedState.selectedEvent.id !== eventId) {
              await fetchExistingTeams(savedState.selectedEvent.id);
              await loadParticipants(savedState.selectedEvent, usersMap, savedState.selectedEvent.id);
            }
          }
          if (savedState.teamMembers) {
            setTeamMembers(savedState.teamMembers);
          }
          if (savedState.formValues) {
            // Restore form values, converting moment objects
            const formValues = { ...savedState.formValues };
            if (formValues.matchDate && typeof formValues.matchDate === 'string') {
              formValues.matchDate = moment(formValues.matchDate);
            }
            if (formValues.matchTime && typeof formValues.matchTime === 'string') {
              formValues.matchTime = moment(formValues.matchTime, 'HH:mm');
            }
            form.setFieldsValue(formValues);
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
  }, [userId, eventId, loadStateFromLocalStorage, form]);

  // Save state whenever it changes
  useEffect(() => {
    if (!loading && selectedEvent) {
      saveStateToLocalStorage();
    }
  }, [selectedEvent, teamMembers, saveStateToLocalStorage, loading]);

  // Save form values on change
  const handleFormValuesChange = useCallback(() => {
    if (!loading && selectedEvent) {
      // Delay to avoid too frequent saves
      const timeoutId = setTimeout(saveStateToLocalStorage, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [saveStateToLocalStorage, loading, selectedEvent]);

  // Fetch existing teams for the selected event
  const fetchExistingTeams = async (eventId) => {
    try {
      const teamsQuery = query(
        collection(db, 'teams'), 
        where('eventId', '==', eventId),
        where('coachId', '==', userId)
      );
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = [];
      
      teamsSnapshot.forEach(doc => {
        teamsData.push({ 
          id: doc.id, 
          ...doc.data() 
        });
      });
      
      setExistingTeams(teamsData);
      
      // Update assigned participants set
      const assignedSet = new Set();
      teamsData.forEach(team => {
        if (team.participants) {
          team.participants.forEach(participantId => {
            assignedSet.add(participantId);
          });
        }
      });
      setAssignedParticipants(assignedSet);
    } catch (error) {
      console.error('Error fetching existing teams:', error);
    }
  };

  const loadParticipants = async (event, usersMap = allUsers, currentEventId = null) => {
    if (!event || !event.participants || event.participants.length === 0) {
      setParticipants([]);
      return;
    }

    try {
      setLoading(true);
      
      // Get current assigned participants for this specific event
      if (currentEventId) {
        await fetchExistingTeams(currentEventId);
      }
      
      const participantData = event.participants
        .map(participantId => {
          const user = usersMap[participantId];
          if (user) {
            const isAssigned = assignedParticipants.has(participantId);
            return {
              key: participantId,
              id: participantId,
              name: user.name,
              email: user.email,
              age: user.age || 'N/A',
              games: user.selectedGames || [],
              isAssigned
            };
          }
          return null;
        })
        .filter(Boolean);

      // Only show unassigned participants in the available list
      const availableParticipants = participantData.filter(p => !p.isAssigned);
      setParticipants(availableParticipants);

      // Show info about assigned participants
      const assignedCount = participantData.length - availableParticipants.length;
      if (assignedCount > 0) {
        message.info(`${assignedCount} participant(s) are already assigned to other teams in this event`);
      }
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
    form.resetFields();
    
    if (event) {
      await fetchExistingTeams(eventId);
      await loadParticipants(event, allUsers, eventId);
      navigate(`/dashboard/teams/create/${userId}/${eventId}`);
    } else {
      navigate(`/dashboard/teams/create/${userId}`);
      setExistingTeams([]);
      setAssignedParticipants(new Set());
      clearSavedState();
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

      const draggedParticipant = participants[source.index];
      
      // Double-check if participant is assigned (safety check)
      if (assignedParticipants.has(draggedParticipant.id)) {
        message.error(`${draggedParticipant.name} is already assigned to another team`);
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

      // Final check that none of the selected team members are already assigned
      const conflictingMembers = teamMembers.filter(member => assignedParticipants.has(member.id));
      
      if (conflictingMembers.length > 0) {
        message.error(`The following participants are already assigned to other teams: ${conflictingMembers.map(m => m.name).join(', ')}`);
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

      // Clear saved state after successful creation
      clearSavedState();

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

  // Calculate statistics for better UX
  const getEventStatistics = () => {
    if (!selectedEvent) return null;
    
    const totalParticipants = selectedEvent.participants?.length || 0;
    const assignedCount = assignedParticipants.size;
    const availableCount = totalParticipants - assignedCount;
    const requiredTeamSize = teamSizeConfig[selectedEvent.gameType] || 2;
    const possibleTeams = Math.floor(availableCount / requiredTeamSize);
    
    return {
      totalParticipants,
      assignedCount,
      availableCount,
      possibleTeams,
      existingTeamsCount: existingTeams.length
    };
  };

  if (loading && events.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  const stats = getEventStatistics();

  return (
    <div style={{ padding: 24 }}>
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => {
          clearSavedState();
          navigate(`/dashboard/teams/${userId}`);
        }}
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
            
            {stats && (
              <div style={{ marginTop: 16 }}>
                <Alert
                  type="info"
                  showIcon
                  message="Event Statistics"
                  description={
                    <div>
                      <p>Total Participants: <Badge count={stats.totalParticipants} style={{ backgroundColor: '#52c41a' }} /></p>
                      <p>Already Assigned: <Badge count={stats.assignedCount} style={{ backgroundColor: '#faad14' }} /></p>
                      <p>Available: <Badge count={stats.availableCount} style={{ backgroundColor: '#1890ff' }} /></p>
                      <p>Existing Teams: <Badge count={stats.existingTeamsCount} style={{ backgroundColor: '#722ed1' }} /></p>
                      <p>Possible New Teams: <Badge count={stats.possibleTeams} style={{ backgroundColor: '#eb2f96' }} /></p>
                    </div>
                  }
                />
              </div>
            )}
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
                extra={
                  stats && stats.assignedCount > 0 && (
                    <Tag color="orange">
                      {stats.assignedCount} already assigned
                    </Tag>
                  )
                }
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
                        participants.map((participant, index) => {
                          const isAssigned = assignedParticipants.has(participant.id);
                          return (
                            <Draggable 
                              key={participant.id} 
                              draggableId={participant.id} 
                              index={index}
                              isDragDisabled={isAssigned} // Disable dragging for assigned participants
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    userSelect: 'none',
                                    padding: '12px',
                                    margin: '0 0 8px 0',
                                    backgroundColor: isAssigned ? '#f5f5f5' : '#fff',
                                    border: `1px solid ${isAssigned ? '#d9d9d9' : '#d9d9d9'}`,
                                    borderRadius: '4px',
                                    opacity: isAssigned ? 0.6 : 1,
                                    cursor: isAssigned ? 'not-allowed' : 'grab',
                                    ...provided.draggableProps.style
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <Avatar 
                                        size="small" 
                                        icon={<UserOutlined />} 
                                        style={{ 
                                          marginRight: 8, 
                                          backgroundColor: isAssigned ? '#faad14' : '#1890ff' 
                                        }} 
                                      />
                                      <div>
                                        <div style={{ color: isAssigned ? '#666' : '#000' }}>
                                          {participant.name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                          {participant.games.map(game => (
                                            <Tag color={getGameColor(game)} key={game} style={{ marginRight: 4, marginTop: 4 }}>
                                              {game}
                                            </Tag>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    {isAssigned && (
                                      <Tag icon={<LockOutlined />} color="orange">
                                        Assigned
                                      </Tag>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      ) : (
                        <Empty 
                          description={
                            stats && stats.assignedCount > 0 
                              ? `All participants are already assigned to teams` 
                              : "No participants available"
                          } 
                        />
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
                <Form 
                  form={form} 
                  layout="vertical"
                  onValuesChange={handleFormValuesChange}
                >
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