import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Badge, 
  Button, 
  Typography, 
  message, 
  Tag,
  Avatar,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  BarChartOutlined,
  PieChartOutlined,
  TeamOutlined,
  CalendarOutlined,
  TrophyOutlined,
  UserOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import ContentLoader from '../contentLoader/ContentLoader';
import './dashboard.css';
import { auth, db } from '../../utils/constants/Firebase';
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend,
  ArcElement 
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const { Title: AntTitle, Text } = Typography;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [createdEvents, setCreatedEvents] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const navigate = useNavigate();
  const { userId } = useParams();
  const [events, setEvents] = useState([]);

  
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.email);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const userDataFromDB = userDoc.data();
            
            if (userDataFromDB.userType === 'coach') {
              if (userDataFromDB.status === 'pending') {
                navigate('/pending-request');
                return;
              } else if (userDataFromDB.status === 'declined') {
                navigate('/request-declined');
                return;
              }
            }
            
            setUserData(userDataFromDB);
            await fetchDashboardData(userDataFromDB);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
          setAuthChecked(true);
        }
      } else {
        setAuthChecked(true);
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchDashboardData = async (userData) => {
    try {
      // Fetch events and teams data
      const [eventsSnapshot, teamsSnapshot] = await Promise.all([
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'teams'))
      ]);
      
      const allEvents = [];
      const userJoinedEvents = [];
      const userCreatedEvents = [];
      const analytics = {
        eventsByGame: {},
        participantsByEvent: {},
        teamDistribution: {},
        upcomingEvents: 0,
        pastEvents: 0
      };
      
      const now = new Date();
      
      // Process events
      eventsSnapshot.forEach((doc) => {
        const eventData = { id: doc.id, ...doc.data() };
        if (eventData.eventDate && eventData.eventDate instanceof Timestamp) {
          eventData.eventDate = eventData.eventDate.toDate();
        }
        
        allEvents.push(eventData);
        
        // Check if user has joined this event
        if (userData.userType === 'player' && 
            eventData.participants?.includes(userData.uniqueId)) {
          userJoinedEvents.push(eventData);
        }
        
        // Check if user created this event
        if (userData.userType === 'coach' && eventData.coachId === userData.uniqueId) {
          userCreatedEvents.push(eventData);
        }
        
        // Analytics data
        if (userData.userType === 'coach' && eventData.coachId === userData.uniqueId) {
          // Count events by game type
          analytics.eventsByGame[eventData.gameType] = 
            (analytics.eventsByGame[eventData.gameType] || 0) + 1;
          
          // Count participants
          analytics.participantsByEvent[eventData.id] = {
            title: eventData.title,
            count: eventData.participants?.length || 0
          };
          
          // Count upcoming/past events
          if (eventData.eventDate > now) {
            analytics.upcomingEvents++;
          } else {
            analytics.pastEvents++;
          }
        }
      });
      
      // Process teams data for coach
      if (userData.userType === 'coach') {
        teamsSnapshot.forEach((doc) => {
          const teamData = doc.data();
          if (teamData.coachId === userData.uniqueId) {
            analytics.teamDistribution[teamData.gameType] = 
              (analytics.teamDistribution[teamData.gameType] || 0) + 1;
          }
        });
      }
      
      setEvents(allEvents);
      setJoinedEvents(userJoinedEvents);
      setCreatedEvents(userCreatedEvents);
      setAnalyticsData(analytics);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      message.error('Failed to load dashboard data');
    }
  };

  // Prepare chart data for coach dashboard
  const getCoachChartData = () => {
    if (!analyticsData) return null;
    
    // Events by Game Type (Bar Chart)
    const gameTypes = Object.keys(analyticsData.eventsByGame);
    const eventsCount = gameTypes.map(game => analyticsData.eventsByGame[game]);
    
    const eventsByGameChart = {
      labels: gameTypes,
      datasets: [
        {
          label: 'Events by Game Type',
          data: eventsCount,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#8AC24A', '#607D8B'
          ],
          borderWidth: 1
        }
      ]
    };
    
    // Participants by Event (Horizontal Bar Chart)
    const eventIds = Object.keys(analyticsData.participantsByEvent);
    const participantData = eventIds.map(id => ({
      event: analyticsData.participantsByEvent[id].title,
      count: analyticsData.participantsByEvent[id].count
    }));
    
    // Sort by participant count (descending)
    participantData.sort((a, b) => b.count - a.count);
    
    const participantsByEventChart = {
      labels: participantData.map(item => item.event),
      datasets: [
        {
          label: 'Participants',
          data: participantData.map(item => item.count),
          backgroundColor: '#36A2EB',
          borderWidth: 1
        }
      ]
    };
    
    // Team Distribution (Doughnut Chart)
    const teamGameTypes = Object.keys(analyticsData.teamDistribution);
    const teamCounts = teamGameTypes.map(game => analyticsData.teamDistribution[game]);
    
    const teamDistributionChart = {
      labels: teamGameTypes,
      datasets: [
        {
          data: teamCounts,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#8AC24A', '#607D8B'
          ],
          borderWidth: 1
        }
      ]
    };
    
    // Event Timeline (Pie Chart)
    const eventTimelineChart = {
      labels: ['Upcoming Events', 'Past Events'],
      datasets: [
        {
          data: [analyticsData.upcomingEvents, analyticsData.pastEvents],
          backgroundColor: ['#4BC0C0', '#FF6384'],
          borderWidth: 1
        }
      ]
    };
    
    return {
      eventsByGameChart,
      participantsByEventChart,
      teamDistributionChart,
      eventTimelineChart
    };
  };
  
  // Prepare chart data for player dashboard
  const getPlayerChartData = () => {
    if (!joinedEvents.length) return null;
    
    // Games Played (Doughnut Chart)
    const gameCounts = {};
    joinedEvents.forEach(event => {
      gameCounts[event.gameType] = (gameCounts[event.gameType] || 0) + 1;
    });
    
    const gamesPlayedChart = {
      labels: Object.keys(gameCounts),
      datasets: [
        {
          data: Object.values(gameCounts),
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', 
            '#9966FF', '#FF9F40', '#8AC24A', '#607D8B'
          ],
          borderWidth: 1
        }
      ]
    };
    
    // Upcoming Events Timeline (Pie Chart)
    const now = new Date();
    let upcoming = 0;
    let past = 0;
    
    joinedEvents.forEach(event => {
      if (event.eventDate > now) {
        upcoming++;
      } else {
        past++;
      }
    });
    
    const eventTimelineChart = {
      labels: ['Upcoming Events', 'Past Events'],
      datasets: [
        {
          data: [upcoming, past],
          backgroundColor: ['#4BC0C0', '#FF6384'],
          borderWidth: 1
        }
      ]
    };
    
    return {
      gamesPlayedChart,
      eventTimelineChart
    };
  };

  const renderCoachDashboard = () => {
    const chartData = getCoachChartData();
    
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <AntTitle level={2}>Coach Dashboard</AntTitle>
          <Badge.Ribbon text="Coach Account" color="blue" />
        </div>

        {/* Analytics Section */}
        {chartData && (
          <div className="analytics-section">
            <AntTitle level={4} className="section-title">
              <BarChartOutlined /> Analytics Overview
            </AntTitle>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Events by Game Type">
                  <Bar 
                    data={chartData.eventsByGameChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card title="Participants by Event">
                  <Bar 
                    data={chartData.participantsByEventChart}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card title="Team Distribution">
                  <Doughnut 
                    data={chartData.teamDistributionChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card title="Event Timeline">
                  <Pie 
                    data={chartData.eventTimelineChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="quick-stats-section">
          <AntTitle level={4} className="section-title">
            <TrophyOutlined /> Quick Stats
          </AntTitle>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <div className="stat-content">
                  <TeamOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Total Events</Text>
                    <AntTitle level={3} className="stat-value">
                      {createdEvents.length}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <div className="stat-content">
                  <UserOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Total Participants</Text>
                    <AntTitle level={3} className="stat-value">
                      {analyticsData ? 
                        Object.values(analyticsData.participantsByEvent)
                          .reduce((sum, item) => sum + item.count, 0) : 0}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <div className="stat-content">
                  <CalendarOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Upcoming Events</Text>
                    <AntTitle level={3} className="stat-value">
                      {analyticsData?.upcomingEvents || 0}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={6}>
              <Card className="stat-card">
                <div className="stat-content">
                  <PieChartOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Teams Created</Text>
                    <AntTitle level={3} className="stat-value">
                      {analyticsData ? 
                        Object.values(analyticsData.teamDistribution)
                          .reduce((sum, count) => sum + count, 0) : 0}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  const renderPlayerDashboard = () => {
    const chartData = getPlayerChartData();
    
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <AntTitle level={2}>Player Dashboard</AntTitle>
          <Badge.Ribbon text="Player Account" color="green" />
        </div>

        {/* Analytics Section */}
        {chartData && (
          <div className="analytics-section">
            <AntTitle level={4} className="section-title">
              <BarChartOutlined /> Your Activity
            </AntTitle>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card title="Games Played">
                  <Doughnut 
                    data={chartData.gamesPlayedChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
              
              <Col xs={24} md={12}>
                <Card title="Event Timeline">
                  <Pie 
                    data={chartData.eventTimelineChart}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'right',
                        },
                      },
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
        
        {/* Quick Stats */}
        <div className="quick-stats-section">
          <AntTitle level={4} className="section-title">
            <TrophyOutlined /> Your Stats
          </AntTitle>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card className="stat-card">
                <div className="stat-content">
                  <CalendarOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Total Events</Text>
                    <AntTitle level={3} className="stat-value">
                      {joinedEvents.length}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card className="stat-card">
                <div className="stat-content">
                  <TeamOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Games Played</Text>
                    <AntTitle level={3} className="stat-value">
                      {chartData ? chartData.gamesPlayedChart.labels.length : 0}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
            
            <Col xs={24} sm={12} md={8}>
              <Card className="stat-card">
                <div className="stat-content">
                  <UserOutlined className="stat-icon" />
                  <div>
                    <Text className="stat-label">Upcoming Events</Text>
                    <AntTitle level={3} className="stat-value">
                      {chartData ? chartData.eventTimelineChart.datasets[0].data[0] : 0}
                    </AntTitle>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  if (!authChecked || loading) {
    return <ContentLoader />;
  }

  return userData?.userType === 'player' ? renderPlayerDashboard() : renderCoachDashboard();
};

export default Dashboard;