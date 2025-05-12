import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where, Timestamp, doc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { Button, Card, Modal, Form, Input, DatePicker, Select, message, Empty, Tabs, Tag, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, CalendarOutlined, TeamOutlined, TrophyOutlined, ClockCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import './event.css';
import { Link } from 'react-router-dom';

const { Option } = Select;
const { TabPane } = Tabs;

const AVAILABLE_GAMES = [
  "Football",
  "Cricket",
  "Basketball",
  "Volleyball",
  "Tennis",
  "Badminton",
  "Table Tennis",
  "Swimming"
];

const Event = () => {
  const { userId } = useParams();
  const [events, setEvents] = useState([]);
  const [userEvents, setUserEvents] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [userType, setUserType] = useState('');
  const [userGames, setUserGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get all user documents
        const usersSnapshot = await getDocs(collection(db, 'users'));
        let currentUser = null;
        
        // Find the user with matching uniqueId
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.uniqueId === userId) {
            currentUser = { ...userData, email: doc.id };
          }
        });

        if (currentUser) {
          setUserType(currentUser.userType);
          setUserGames(currentUser.selectedGames || []);
        }
        
        fetchEvents();
      } catch (error) {
        console.error('Error fetching user data:', error);
        message.error('Failed to load user data');
      }
    };

    const fetchEvents = async () => {
      try {
        const eventsSnapshot = await getDocs(collection(db, 'events'));
        const allEvents = [];
        const joinedEvents = [];
        
        eventsSnapshot.forEach((doc) => {
          const eventData = { id: doc.id, ...doc.data() };
          
          // Convert Firestore timestamp to Date object
          if (eventData.eventDate && eventData.eventDate instanceof Timestamp) {
            eventData.eventDate = eventData.eventDate.toDate();
          }
          
          allEvents.push(eventData);
          
          // Check if user has joined this event
          if (eventData.participants && eventData.participants.includes(userId)) {
            joinedEvents.push(eventData);
          }
        });
        
        setEvents(allEvents);
        setUserEvents(joinedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
        message.error('Failed to load events');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const showModal = (mode = 'create', eventId = null) => {
    setIsEditMode(mode === 'edit');
    setCurrentEventId(eventId);
    
    if (mode === 'edit' && eventId) {
      const eventToEdit = events.find(event => event.id === eventId);
      if (eventToEdit) {
        // Set form values for editing
        form.setFieldsValue({
          title: eventToEdit.title,
          description: eventToEdit.description,
          location: eventToEdit.location,
          gameType: eventToEdit.gameType,
          eventDate: moment(eventToEdit.eventDate),
          maxParticipants: eventToEdit.maxParticipants.toString(),
        });
      }
    } else {
      // Reset form for create mode
      form.resetFields();
    }
    
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsEditMode(false);
    setCurrentEventId(null);
    form.resetFields();
  };

  const onFinish = async (values) => {
    try {
      // Ensure values.eventDate is a moment object
      const eventDate = values.eventDate instanceof moment 
        ? values.eventDate.toDate() 
        : new Date(values.eventDate);

      const eventData = {
        title: values.title,
        description: values.description,
        location: values.location,
        gameType: values.gameType,
        eventDate: Timestamp.fromDate(eventDate),
        maxParticipants: parseInt(values.maxParticipants, 10),
      };

      if (isEditMode && currentEventId) {
        // Update existing event
        const eventRef = doc(db, 'events', currentEventId);
        await updateDoc(eventRef, eventData);
        message.success('Event updated successfully');
      } else {
        // Create new event
        eventData.coachId = userId;
        eventData.createdAt = Timestamp.now();
        eventData.participants = [];
        await addDoc(collection(db, 'events'), eventData);
        message.success('Event created successfully');
      }
      
      setIsModalVisible(false);
      setIsEditMode(false);
      setCurrentEventId(null);
      form.resetFields();
      
      // Refresh events list
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const allEvents = [];
      
      eventsSnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() };
        if (event.eventDate && event.eventDate instanceof Timestamp) {
          event.eventDate = event.eventDate.toDate();
        }
        allEvents.push(event);
      });
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Error saving event:', error);
      message.error(`Failed to ${isEditMode ? 'update' : 'create'} event`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      message.success('Event deleted successfully');
      
      // Update local state
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    } catch (error) {
      console.error('Error deleting event:', error);
      message.error('Failed to delete event');
    }
  };

  const handleJoinEvent = async (eventId) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        participants: arrayUnion(userId)
      });
      
      message.success('Successfully joined the event');
      
      // Update local state
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId 
            ? { ...event, participants: [...(event.participants || []), userId] } 
            : event
        )
      );
      
      // Also update userEvents
      const event = events.find(e => e.id === eventId);
      if (event) {
        setUserEvents(prev => [...prev, { ...event, participants: [...(event.participants || []), userId] }]);
      }
    } catch (error) {
      console.error('Error joining event:', error);
      message.error('Failed to join event');
    }
  };

  const canJoinEvent = (event) => {
    // Check if user is a player
    if (userType !== 'player') return false;
    
    // Check if player has registered for this game type
    if (!userGames.includes(event.gameType)) return false;
    
    // Check if player already joined
    if (event.participants && event.participants.includes(userId)) return false;
    
    // Check if event is full
    if (event.participants && event.participants.length >= event.maxParticipants) return false;
    
    return true;
  };

  const renderEventCard = (event) => {
    const isJoined = event.participants && event.participants.includes(userId);
    const isFull = event.participants && event.participants.length >= event.maxParticipants;
    const isCoachEvent = event.coachId === userId;
    
    return (
      <Card 
        key={event.id} 
        className="event-card"
        title={event.title}
        extra={
          <Tag color={getGameColor(event.gameType)}>
            {event.gameType}
          </Tag>
        }
        actions={userType === 'coach' && isCoachEvent ? [
          <Tooltip title="Edit Event">
            <EditOutlined key="edit" onClick={() => showModal('edit', event.id)} />
          </Tooltip>,
          <Popconfirm
            title="Are you sure you want to delete this event?"
            onConfirm={() => handleDeleteEvent(event.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Event">
              <DeleteOutlined key="delete" />
            </Tooltip>
          </Popconfirm>
        ] : []}
      >
        <p className="event-description">{event.description}</p>
        <div className="event-details">
          <p><CalendarOutlined /> {moment(event.eventDate).format('MMMM D, YYYY - h:mm A')}</p>
          <p><ClockCircleOutlined /> {moment(event.eventDate).fromNow()}</p>
          <p><TeamOutlined /> Participants: {(event.participants ? event.participants.length : 0)} / {event.maxParticipants}</p>
          <p><TrophyOutlined /> Location: {event.location}</p>
        </div>
        
        {userType === 'player' && (
          <div className="event-actions">
            {isJoined ? (
              <Button type="primary" disabled>
                Already Joined
              </Button>
            ) : canJoinEvent(event) ? (
              <Button 
                type="primary" 
                onClick={() => handleJoinEvent(event.id)}
              >
                Join Event
              </Button>
            ) : (
              <Tooltip title={
                !userGames.includes(event.gameType) 
                  ? "You haven't registered for this game type" 
                  : isFull 
                    ? "This event is full" 
                    : "Unable to join"
              }>
                <Button type="primary" disabled>
                  {!userGames.includes(event.gameType) 
                    ? "Not Registered" 
                    : isFull 
                      ? "Event Full" 
                      : "Join Event"}
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Function to determine tag color based on game type
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

  return (
    <div className="events-container">
      <div className="events-header">
        <h1>Events</h1>
        {userType === 'coach' && userGames.length > 0 && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => showModal('create')}>
            Create Event
          </Button>
        )}
      </div>

      <Tabs defaultActiveKey="all" className="events-tabs">
        <TabPane tab="All Events" key="all">
          {loading ? (
            <div className="loading-container">Loading events...</div>
          ) : events.length > 0 ? (
            <div className="events-grid">
              {events.map(event => renderEventCard(event))}
            </div>
          ) : (
            <Empty description="No events found" />
          )}
        </TabPane>
        
        {userType === 'player' && (
          <TabPane tab="My Events" key="my">
            {loading ? (
              <div className="loading-container">Loading your events...</div>
            ) : userEvents.length > 0 ? (
              <div className="events-grid">
                {userEvents.map(event => renderEventCard(event))}
              </div>
            ) : (
              <Empty description="You haven't joined any events yet" />
            )}
          </TabPane>
        )}
        
        {userType === 'coach' && (
          <TabPane tab="My Created Events" key="created">
            {loading ? (
              <div className="loading-container">Loading your events...</div>
            ) : events.filter(e => e.coachId === userId).length > 0 ? (
              <div className="events-grid">
                {events
                  .filter(event => event.coachId === userId)
                  .map(event => renderEventCard(event))}
              </div>
            ) : (
              <Empty description="You haven't created any events yet" />
            )}
          </TabPane>
        )}
      </Tabs>

      <Modal
        title={isEditMode ? "Edit Event" : "Create New Event"}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form
          form={form}
          name="eventForm"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="Event Title"
            rules={[
              { required: true, message: 'Please enter event title' }
            ]}
          >
            <Input placeholder="Enter event title" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Please enter event description' }
            ]}
          >
            <Input.TextArea rows={4} placeholder="Enter event description" />
          </Form.Item>

          <Form.Item
            name="gameType"
            label="Game Type"
            rules={[
              { required: true, message: 'Please select game type' }
            ]}
          >
            <Select placeholder="Select game type">
              {userGames.map(game => (
                <Option key={game} value={game}>{game}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="location"
            label="Location"
            rules={[
              { required: true, message: 'Please enter event location' }
            ]}
          >
            <Input placeholder="Enter event location" />
          </Form.Item>

          <Form.Item
            name="eventDate"
            label="Event Date & Time"
            rules={[
              { required: true, message: 'Please select event date and time' }
            ]}
          >
            <DatePicker 
              showTime 
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="maxParticipants"
            label="Maximum Participants"
            rules={[
              { required: true, message: 'Please enter maximum participants' }
            ]}
          >
            <Input type="number" min={1} placeholder="Enter maximum participants" />
          </Form.Item>

          <Form.Item>
            <div className="form-buttons">
              <Button onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {isEditMode ? 'Update Event' : 'Create Event'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Event;