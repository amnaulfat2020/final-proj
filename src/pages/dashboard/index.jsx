import React, { useState, useEffect } from "react";
import { 
  Card, 
  Badge, 
  Pagination, 
  Button, 
  Typography, 
  message, 
  Tag, 
  Progress,
  List,
  Avatar
} from "antd";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from "react-router-dom";
import ContentLoader from "../contentLoader/ContentLoader";
import "./dashboard.css";
import { auth, db } from "../../utils/constants/Firebase";
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  updateDoc,
  arrayRemove,
  arrayUnion,
  writeBatch
} from "firebase/firestore";
import { 
  CalendarOutlined, 
  ClockCircleOutlined, 
  EnvironmentOutlined, 
  TeamOutlined,
  CheckOutlined,
  CloseOutlined,
  UserOutlined
} from "@ant-design/icons";
import { Timestamp } from "firebase/firestore";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const { Title, Text } = Typography;

// Role Selection Screen Component
// const RoleSelectionScreen = ({ onRoleSelect }) => {
  // return (
    // <div className="role-selection-screen">
    //   <Card className="role-selection-card">
    //     <Title level={3} className="role-selection-title">
    //       Welcome to VU Sport society!
    //     </Title>
    //     <Title level={5} className="role-selection-subtitle">
    //       Please select your role to continue:
    //     </Title>
    //     <div className="role-buttons">
    //       <Button
    //         type="primary"
    //         size="large"
    //         className="role-button"
    //         onClick={() => onRoleSelect("player")}
    //       >
    //         As a Player/Team
    //       </Button>
    //       <Button
    //         type="primary"
    //         size="large"
    //         className="role-button"
    //         onClick={() => onRoleSelect("coach")}
    //       >
    //         As a Coach
    //       </Button>
    //     </div>
      // </Card>
    // </div>
  // );
// };

// Event Card with Timer Component
const EventCardWithTimer = ({ event }) => {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalHours: 0
  });
  
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const eventDate = event.eventDate.toDate ? event.eventDate.toDate() : new Date(event.eventDate);
      const now = new Date();
      const difference = eventDate - now;
      
      // Handle past events
      if (difference < 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalHours: 0,
          isPast: true
        };
      }
      
      // Calculate time units
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      const totalHours = Math.floor(difference / (1000 * 60 * 60));
      
      return {
        days,
        hours,
        minutes,
        seconds,
        totalHours,
        isPast: false
      };
    };
    
    // Initial calculation
    setTimeRemaining(calculateTimeRemaining());
    
    // Set up timer
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);
    
    // Clean up
    return () => clearInterval(timer);
  }, [event]);
  
  // Calculate progress for visual countdown
  const totalDuration = 7 * 24; // Assuming 7 days is 100%
  const progressPercentage = Math.max(0, Math.min(100, (1 - (timeRemaining.totalHours / totalDuration)) * 100));
  
  return (
    <Card className="event-card">
      <div className="event-card-header">
        <Title level={4} className="event-title">{event.title}</Title>
        <Tag color={getGameTagColor(event.gameType)}>{event.gameType}</Tag>
      </div>
      
      <div className="event-card-body">
        <p><CalendarOutlined /> {formatEventDate(event.eventDate)}</p>
        <p><ClockCircleOutlined /> {formatEventTime(event.eventDate)}</p>
        <p><EnvironmentOutlined /> {event.location}</p>
        {event.maxParticipants && (
          <p><TeamOutlined /> Participants: {(event.participants ? event.participants.length : 0)} / {event.maxParticipants}</p>
        )}
      </div>
      
      <div className="event-timer">
        {timeRemaining.isPast ? (
          <div className="past-event">
            <Tag color="red">Event has passed</Tag>
          </div>
        ) : (
          <>
            <Progress percent={progressPercentage} status="active" showInfo={false} />
            <div className="timer-container">
              <div className="timer-unit">
                <span className="timer-value">{timeRemaining.days}</span>
                <span className="timer-label">days</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{timeRemaining.hours}</span>
                <span className="timer-label">hours</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{timeRemaining.minutes}</span>
                <span className="timer-label">min</span>
              </div>
              <div className="timer-unit">
                <span className="timer-value">{timeRemaining.seconds}</span>
                <span className="timer-label">sec</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

// Helper functions
const formatDate = (date) => {
  if (!date) return 'N/A';
  const options = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(date).toLocaleDateString('en-US', options);
};

const formatEventDate = (date) => {
  const eventDate = date.toDate ? date.toDate() : new Date(date);
  return eventDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const formatEventTime = (date) => {
  const eventDate = date.toDate ? date.toDate() : new Date(date);
  return eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const getGameTagColor = (gameType) => {
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

// Player Dashboard Component
const PlayerDashboard = ({ events, joinedEvents, loading, currentPage, totalEvents, pageSize, handlePageChange, userData }) => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const itemsToShow = events.slice(start, end);

  const playerBarChartData = {
    labels: ['Training Sessions', 'Matches', 'Achievements'],
    datasets: [
      {
        label: 'Player Statistics',
        data: [12, 8, 5],
        backgroundColor: [
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 99, 132, 0.6)',
          'rgba(75, 192, 192, 0.6)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Title level={2}>Player Dashboard</Title>
        <Badge.Ribbon text="Player Account" color="green" />
      </div>

      {/* Joined Events Section */}
      <div className="joined-events-section">
        <Title level={3}>Your Upcoming Events</Title>
        {loading ? (
          <ContentLoader />
        ) : joinedEvents.length > 0 ? (
          <div className="joined-events-grid">
            {joinedEvents.map((event, index) => (
              <EventCardWithTimer key={`joined-${event.id}`} event={event} />
            ))}
          </div>
        ) : (
          <Card className="empty-state-card">
            <Text>You haven't joined any events yet. Check the Events page to join upcoming games!</Text>
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => window.location.href = `/dashboard/event/${userData.uniqueId}`}>
              Browse Events
            </Button>
          </Card>
        )}
      </div>

      <div className="dashboard-stats">
        <Card className="stats-card">
          <Title level={4}>Your Performance</Title>
          <Bar data={playerBarChartData} />
        </Card>

        <Card className="stats-card">
          <Title level={4}>Training Attendance</Title>
          <Pie 
            data={{
              labels: ['Attended', 'Missed'],
              datasets: [
                {
                  data: [85, 15],
                  backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                  borderColor: ['rgba(75, 192, 192, 1)', 'rgba(255, 99, 132, 1)'],
                  borderWidth: 1,
                }
              ]
            }} 
          />
        </Card>
      </div>

      <div className="upcoming-events">
        <Title level={3}>Upcoming Training Sessions</Title>
        {loading ? (
          <ContentLoader />
        ) : (
          <>
            <div className="events-grid">
              {itemsToShow.map((event, index) => (
                <Card key={index} className="event-card">
                  <Title level={4}>{event.title || "Training Session"}</Title>
                  <p>Date: {event.date || "Next Monday"}</p>
                  <p>Time: {event.time || "6:00 PM"}</p>
                  <p>Location: {event.location || "Main Field"}</p>
                  <Button type="primary">Join</Button>
                </Card>
              ))}
            </div>
            <Pagination
              current={currentPage}
              total={totalEvents}
              pageSize={pageSize}
              onChange={handlePageChange}
              className="pagination"
            />
          </>
        )}
      </div>
    </div>
  );
};

// Coach Dashboard Component
const CoachDashboard = ({ events, createdEvents, loading, currentPage, totalEvents, pageSize, handlePageChange, userData }) => {
  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const itemsToShow = events.slice(start, end);
  const [approvalRequests, setApprovalRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showApprovalDropdown, setShowApprovalDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (userData && userData.userType === "coach") {
      const fetchApprovalRequests = async () => {
        try {
          const requestsRef = collection(db, "approvalRequests");
          const q = query(
            requestsRef,
            where("coachEmail", "==", userData.email),
            where("status", "==", "pending")
          );
          
          const querySnapshot = await getDocs(q);
          const requests = [];
          querySnapshot.forEach((doc) => {
            requests.push({ id: doc.id, ...doc.data() });
          });
          setApprovalRequests(requests);
        } catch (error) {
          console.error("Error fetching approval requests:", error);
        } finally {
          setLoadingRequests(false);
        }
      };
      
      fetchApprovalRequests();
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        query(
          collection(db, "approvalRequests"),
          where("coachEmail", "==", userData.email),
          where("status", "==", "pending")
        ),
        (snapshot) => {
          const updatedRequests = [];
          snapshot.forEach((doc) => {
            updatedRequests.push({ id: doc.id, ...doc.data() });
          });
          setApprovalRequests(updatedRequests);
        }
      );
      
      return () => unsubscribe();
    }
  }, [userData]);

  const handleApproveRequest = async (requestId, playerEmail, game) => {
    try {
      // Update the request status
      const requestRef = doc(db, "approvalRequests", requestId);
      await updateDoc(requestRef, {
        status: "approved",
        approvedAt: Timestamp.now()
      });
      
      // Update the player's document
      const playerRef = doc(db, "users", playerEmail);
      await updateDoc(playerRef, {
        pendingApprovals: arrayRemove({
          game: game,
          status: "pending"
        }),
        approvedGames: arrayUnion(game),
        status: "approved"
      });
      
      message.success("Player approved successfully");
    } catch (error) {
      console.error("Error approving request:", error);
      message.error("Failed to approve player");
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const requestRef = doc(db, "approvalRequests", requestId);
      await updateDoc(requestRef, {
        status: "declined",
        declinedAt: Timestamp.now()
      });
      message.success("Request declined");
    } catch (error) {
      console.error("Error declining request:", error);
      message.error("Failed to decline request");
    }
  };

  const coachBarChartData = {
    labels: ['Sessions Conducted', 'Players Trained', 'Evaluations'],
    datasets: [
      {
        label: 'Coach Statistics',
        data: [18, 24, 15],
        backgroundColor: [
          'rgba(255, 159, 64, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 206, 86, 0.6)',
        ],
        borderColor: [
          'rgba(255, 159, 64, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <Title level={2}>Coach Dashboard</Title>
        <Badge.Ribbon text="Coach Account" color="blue" />
        {approvalRequests.length > 0 && (
          <Badge 
            count={approvalRequests.length} 
            style={{ 
              marginLeft: 10,
              backgroundColor: '#ff4d4f',
              fontSize: '14px'
            }} 
          />
        )}
      </div>

      <div className="dashboard-actions">
        <Button 
          type="primary" 
          className="action-button"
          onClick={() => navigate(`/dashboard/event/${userData.uniqueId}`)}
        >
          Create New Event
        </Button>
        <Button type="primary" className="action-button">Player Evaluations</Button>
        <Button type="primary" className="action-button">Team Management</Button>
      </div>

      {/* Improved Approval Requests Section */}
      <div className="approval-requests-section">
        <div 
          className="approval-header"
          onClick={() => setShowApprovalDropdown(!showApprovalDropdown)}
        >
          <Title level={3}>
            Pending Approval Requests 
            <Badge 
              count={approvalRequests.length} 
              style={{ 
                marginLeft: 10,
                backgroundColor: approvalRequests.length > 0 ? '#ff4d4f' : '#d9d9d9'
              }} 
            />
          </Title>
          <Button 
            type="text" 
            icon={showApprovalDropdown ? <UpOutlined /> : <DownOutlined />}
          />
        </div>
        
        {showApprovalDropdown && (
          loadingRequests ? (
            <ContentLoader />
          ) : approvalRequests.length > 0 ? (
            <div className="requests-dropdown">
              {approvalRequests.map((request) => (
                <Card 
                  key={request.id} 
                  className="request-card"
                  hoverable
                >
                  <div className="request-content">
                    <Avatar 
                      size="large" 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                    <div className="request-details">
                      <Text strong>{request.playerEmail}</Text>
                      <Text type="secondary">{request.game}</Text>
                      <Text type="secondary" className="request-time">
                        {formatDate(request.createdAt?.toDate())}
                      </Text>
                    </div>
                  </div>
                  <div className="request-actions">
                    <Button 
                      type="primary" 
                      shape="circle"
                      icon={<CheckOutlined />}
                      onClick={() => handleApproveRequest(request.id, request.playerEmail, request.game)}
                    />
                    <Button 
                      danger 
                      shape="circle"
                      icon={<CloseOutlined />}
                      onClick={() => handleDeclineRequest(request.id)}
                      style={{ marginLeft: 8 }}
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="empty-requests">
              <Text>No pending approval requests</Text>
            </Card>
          )
        )}
      </div>

      {/* Rest of the CoachDashboard remains the same */}
      <div className="created-events-section">
        <Title level={3}>Your Created Events</Title>
        {loading ? (
          <ContentLoader />
        ) : createdEvents.length > 0 ? (
          <div className="created-events-grid">
            {createdEvents.map((event, index) => (
              <EventCardWithTimer key={`created-${event.id}`} event={event} />
            ))}
          </div>
        ) : (
          <Card className="empty-state-card">
            <Text>You haven't created any events yet.</Text>
            <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate(`/dashboard/event/${userData.uniqueId}`)}>
              Create Your First Event
            </Button>
          </Card>
        )}
      </div>

      <div className="dashboard-stats">
        <Card className="stats-card">
          <Title level={4}>Coaching Statistics</Title>
          <Bar data={coachBarChartData} />
        </Card>

        <Card className="stats-card">
          <Title level={4}>Player Distribution</Title>
          <Pie 
            data={{
              labels: ['Advanced', 'Intermediate', 'Beginner'],
              datasets: [
                {
                  data: [30, 45, 25],
                  backgroundColor: [
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                  ],
                  borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)',
                  ],
                  borderWidth: 1,
                }
              ]
            }} 
          />
        </Card>
      </div>

      <div className="upcoming-events">
        <Title level={3}>Upcoming Training Sessions</Title>
        {loading ? (
          <ContentLoader />
        ) : (
          <>
            <div className="events-grid">
              {itemsToShow.map((event, index) => (
                <Card key={index} className="event-card">
                  <Title level={4}>{event.title || "Training Session"}</Title>
                  <p>Date: {event.date || "Next Monday"}</p>
                  <p>Time: {event.time || "6:00 PM"}</p>
                  <p>Location: {event.location || "Main Field"}</p>
                  <Button type="primary">Manage</Button>
                </Card>
              ))}
            </div>
            <Pagination
              current={currentPage}
              total={totalEvents}
              pageSize={pageSize}
              onChange={handlePageChange}
              className="pagination"
            />
          </>
        )}
      </div>
    </div>
  );
};


// Main Dashboard Component
const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);

  const pageSize = 3;
  const navigate = useNavigate();
  const { userId } = useParams(); // Get userId from URL if available
  
  useEffect(() => {
    // Load sample events data
    const sampleEvents = [
      { 
        title: "Training Session 1", 
        date: "April 22, 2025", 
        time: "6:00 PM", 
        location: "Main Field" 
      },
      { 
        title: "Match Preparation", 
        date: "April 25, 2025", 
        time: "5:30 PM", 
        location: "Stadium" 
      },
      { 
        title: "Skills Workshop", 
        date: "April 27, 2025", 
        time: "4:00 PM", 
        location: "Training Center" 
      },
      { 
        title: "Team Building", 
        date: "May 1, 2025", 
        time: "6:30 PM", 
        location: "Recreation Hall" 
      },
      { 
        title: "Fitness Session", 
        date: "May 3, 2025", 
        time: "7:00 PM", 
        location: "Gym" 
      },
    ];
    
    setEvents(sampleEvents);
    
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get user data from Firestore
          const userRef = doc(db, "users", user.email);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userDataFromDB = userDoc.data();
            
            // Check coach status
            if (userDataFromDB.userType === "coach") {
              if (userDataFromDB.status === "pending") {
                navigate("/pending-request");
                return;
              } else if (userDataFromDB.status === "declined") {
                navigate("/request-declined");
                return;
              }
            }
            
            setUserRole(userDataFromDB.userType || "player");
            setUserData(userDataFromDB);
            
            // Fetch events from Firestore
            await fetchEventsFromFirestore(userDataFromDB);
            
          } else {
            setUserRole(null);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserRole(null);
        } finally {
          setLoading(false);
          setAuthChecked(true);
        }
      } else {
        // Only redirect if we're sure there's no user
        setAuthChecked(true);
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);
  
  // Function to fetch events from Firestore
  const fetchEventsFromFirestore = async (userData) => {
    try {
      const eventsCollection = collection(db, "events");
      const eventsSnapshot = await getDocs(eventsCollection);
      
      const allEvents = [];
      const userJoinedEvents = [];
      const userCreatedEvents = [];
      
      eventsSnapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() };
        allEvents.push(eventData);
        
        // Check if user is participant in this event
        if (userData.userType === "player" && 
            eventData.participants && 
            eventData.participants.includes(userData.uniqueId)) {
          userJoinedEvents.push(eventData);
        }
        
        // Check if user created this event
        if (userData.userType === "coach" && eventData.coachId === userData.uniqueId) {
          userCreatedEvents.push(eventData);
        }
      });
      
      // Sort events by date
      const sortByDate = (a, b) => {
        const dateA = a.eventDate?.toDate ? a.eventDate.toDate() : new Date(a.eventDate);
        const dateB = b.eventDate?.toDate ? b.eventDate.toDate() : new Date(b.eventDate);
        return dateA - dateB;
      };
      
      setJoinedEvents(userJoinedEvents.sort(sortByDate));
      setCreatedEvents(userCreatedEvents.sort(sortByDate));
      
    } catch (error) {
      console.error("Error fetching events:", error);
      message.error("Failed to load events");
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleRoleSelect = (role) => {
    setUserRole(role);
    // Here you would update the user's role in the database
  };

  // Show loader while checking auth or loading data
  if (!authChecked || loading) {
    return <ContentLoader />;
  }

  // Show role selection if no role is set
  // if (!userRole) {
  //   return <RoleSelectionScreen onRoleSelect={handleRoleSelect} />;
  // }

  // Render the appropriate dashboard
  return (
    <>
      {userRole === "player" ? (
        <PlayerDashboard 
          events={events}
          joinedEvents={joinedEvents}
          loading={loading}
          currentPage={currentPage}
          totalEvents={events.length}
          pageSize={pageSize}
          handlePageChange={handlePageChange}
          userData={userData}
        />
      ) : (
        <CoachDashboard 
          events={events}
          createdEvents={createdEvents}
          loading={loading}
          currentPage={currentPage}
          totalEvents={events.length}
          pageSize={pageSize}
          handlePageChange={handlePageChange}
          userData={userData}
        />
      )}
    </>
  );
};

export default Dashboard;