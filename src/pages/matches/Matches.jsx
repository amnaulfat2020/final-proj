import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  collection, getDocs, query, where, doc, updateDoc 
} from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { 
  Button, Card, Tag, Select, 
  message, Empty, Spin, List,
  Divider, Row, Col, Typography, Avatar,
  Modal, Radio, Input, Space, Badge
} from 'antd';
import { 
  TeamOutlined, UserOutlined, 
  TrophyOutlined, CalendarOutlined, 
  ClockCircleOutlined, InfoCircleOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  EditOutlined, EyeOutlined, FlagOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './matches.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const Matches = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allUsers, setAllUsers] = useState({});
  const [userType, setUserType] = useState('');
  const [resultModal, setResultModal] = useState({ visible: false, match: null });
  const [resultForm, setResultForm] = useState({
    winner: '',
    score: '',
    notes: ''
  });

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: 'Not scheduled', time: '' };
    
    const matchDateTime = moment(dateTimeString);
    const date = matchDateTime.format('MMM DD, YYYY');
    const time = matchDateTime.format('hh:mm A');
    
    return { date, time };
  };

  const isMatchCompleted = (match) => {
    if (!match.matchDateTime) return false;
    const matchTime = moment(match.matchDateTime);
    const now = moment();
    return now.isAfter(matchTime);
  };

  const getMatchStatus = (match) => {
    if (match.result && match.result.winner) {
      return 'completed';
    }
    if (isMatchCompleted(match)) {
      return 'finished';
    }
    const matchTime = moment(match.matchDateTime);
    const now = moment();
    if (now.isSame(matchTime, 'day')) {
      return 'today';
    }
    if (now.isAfter(matchTime)) {
      return 'past';
    }
    return 'upcoming';
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'success',
      'finished': 'warning',
      'today': 'processing',
      'past': 'default',
      'upcoming': 'blue'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      'completed': 'Result Declared',
      'finished': 'Awaiting Result',
      'today': 'Match Today',
      'past': 'Past Match',
      'upcoming': 'Upcoming'
    };
    return texts[status] || 'Unknown';
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

  const getUserAvatar = (user) => {
    if (user?.photoURL) {
      return <Avatar src={user.photoURL} />;
    }
    return <Avatar>{user?.name?.[0] || '?'}</Avatar>;
  };

  const handleAnnounceResult = (match) => {
    setResultModal({ visible: true, match });
    setResultForm({
      winner: '',
      score: '',
      notes: ''
    });
  };

  const submitResult = async () => {
    try {
      if (!resultForm.winner) {
        message.error('Please select a winner');
        return;
      }

      const matchRef = doc(db, 'matches', resultModal.match.id);
      const resultData = {
        result: {
          winner: resultForm.winner,
          winnerTeamName: resultForm.winner === 'team1' 
            ? resultModal.match.team1Name 
            : resultModal.match.team2Name,
          loser: resultForm.winner === 'team1' ? 'team2' : 'team1',
          loserTeamName: resultForm.winner === 'team1' 
            ? resultModal.match.team2Name 
            : resultModal.match.team1Name,
          score: resultForm.score,
          notes: resultForm.notes,
          announcedBy: userId,
          announcedAt: new Date().toISOString()
        }
      };

      await updateDoc(matchRef, resultData);
      
      // Update local state
      setMatches(prev => prev.map(match => 
        match.id === resultModal.match.id 
          ? { ...match, ...resultData }
          : match
      ));

      message.success('Match result announced successfully!');
      setResultModal({ visible: false, match: null });
      
    } catch (error) {
      console.error('Error announcing result:', error);
      message.error('Failed to announce result');
    }
  };

  useEffect(() => {
    const fetchUserDataAndMatches = async () => {
      try {
        setLoading(true);
        
        // Fetch user data
        const userQuery = query(collection(db, 'users'), where('uniqueId', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          message.error('User not found');
          return;
        }
        
        const userData = userSnapshot.docs[0].data();
        setUserType(userData.userType);
        
        // Fetch all users for player names
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = {};
        usersSnapshot.forEach((doc) => {
          const user = doc.data();
          if (user.uniqueId) {
            usersMap[user.uniqueId] = {
              ...user,
              email: doc.id,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || doc.id,
              photoURL: user.photoURL || null,
              role: user.role || 'Player'
            };
          }
        });
        setAllUsers(usersMap);
        
        // Fetch matches based on user type
        let matchesData = [];
        
        if (userData.userType === 'coach') {
          const coachMatchesQuery = query(
            collection(db, 'matches'), 
            where('createdBy', '==', userId)
          );
          const coachMatchesSnapshot = await getDocs(coachMatchesQuery);
          coachMatchesSnapshot.forEach((doc) => {
            matchesData.push({ id: doc.id, ...doc.data() });
          });
        } else {
          const playerMatchesQuery = query(
            collection(db, 'matches'),
            where('participants', 'array-contains', userId)
          );
          const playerMatchesSnapshot = await getDocs(playerMatchesQuery);
          playerMatchesSnapshot.forEach((doc) => {
            matchesData.push({ id: doc.id, ...doc.data() });
          });
        }
        
        setMatches(matchesData);
        
        // Fetch teams
        let teamsQuery = userData.userType === 'coach'
          ? query(collection(db, 'teams'), where('coachId', '==', userId))
          : query(collection(db, 'teams'), where('participants', 'array-contains', userId));
        
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = [];
        teamsSnapshot.forEach((doc) => {
          teamsData.push({ id: doc.id, ...doc.data() });
        });
        setTeams(teamsData);
        
        // Fetch events
        let eventsQuery = userData.userType === 'coach'
          ? query(collection(db, 'events'), where('coachId', '==', userId))
          : query(collection(db, 'events'), where('participants', 'array-contains', userId));
        
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = [];
        eventsSnapshot.forEach((doc) => {
          eventsData.push({ id: doc.id, ...doc.data() });
        });
        setEvents(eventsData);
        
      } catch (error) {
        console.error('Error:', error);
        message.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserDataAndMatches();
  }, [userId]);

  const handleEventSelect = (eventId) => {
    setSelectedEvent(events.find(e => e.id === eventId) || null);
  };

  const renderMatchCard = (match, isCoachView = false) => {
    const { date, time } = formatDateTime(match.matchDateTime);
    const isPlayerInTeam1 = teams.find(t => t.id === match.team1Id)?.participants.includes(userId);
    const isPlayerInTeam2 = teams.find(t => t.id === match.team2Id)?.participants.includes(userId);
    const status = getMatchStatus(match);
    const canAnnounceResult = isCoachView && status === 'finished';
    const hasResult = match.result && match.result.winner;
    
    return (
      <Card 
        key={match.id}
        className={`match-card ${status} ${hasResult ? 'has-result' : ''}`}
        title={
          <div className="match-card-header">
            <div className="match-teams">
              <span className="team-names">
                {match.team1Name} vs {match.team2Name}
              </span>
              {!isCoachView && (isPlayerInTeam1 || isPlayerInTeam2) && (
                <Tag color="green" className="your-match-tag">Your Match</Tag>
              )}
            </div>
            <div className="match-tags">
              <Tag color={getGameColor(selectedEvent?.gameType)}>
              {selectedEvent?.gameType || match.gameType}              </Tag>
              <Tag color={getStatusColor(status)} className="status-tag">
                {getStatusText(status)}
              </Tag>
            </div>
          </div>
        }
        actions={
          canAnnounceResult ? [
            <Button 
              key="announce" 
              type="primary" 
              icon={<FlagOutlined />}
              onClick={() => handleAnnounceResult(match)}
              className="announce-result-btn"
            >
              Announce Result
            </Button>
          ] : hasResult ? [
            <div key="result-declared" className="result-declared">
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>Result Declared</span>
            </div>
          ] : []
        }
      >
        <div className="match-content">
          <div className="match-basic-info">
            <p className="event-name">
              <TrophyOutlined /> Event: {match.eventName}
            </p>
            
            <div className="match-datetime">
              <div className="datetime-item">
                <CalendarOutlined /> 
                <span>{date}</span>
              </div>
              <div className="datetime-item">
                <ClockCircleOutlined /> 
                <span>{time}</span>
              </div>
            </div>
            
            {match.location && (
              <p className="match-location">
                <InfoCircleOutlined /> Location: {match.location}
              </p>
            )}
          </div>

          {hasResult && (
            <div className="match-result">
              <Divider orientation="left" className="result-divider">
                <TrophyOutlined /> Match Result
              </Divider>
              <div className="result-content">
                <div className="winner-announcement">
                  <Badge.Ribbon text="Winner" color="gold">
                    <div className="winner-card">
                      <h3>{match.result.winnerTeamName}</h3>
                      <p>Defeated {match.result.loserTeamName}</p>
                    </div>
                  </Badge.Ribbon>
                </div>
                {match.result.score && (
                  <div className="match-score">
                    <Text strong>Score: </Text>
                    <Text>{match.result.score}</Text>
                  </div>
                )}
                {match.result.notes && (
                  <div className="match-notes">
                    <Text strong>Notes: </Text>
                    <Text>{match.result.notes}</Text>
                  </div>
                )}
                <div className="result-meta">
                  <Text type="secondary">
                    Result announced by Coach on {moment(match.result.announcedAt).format('MMM DD, YYYY at hh:mm A')}
                  </Text>
                </div>
              </div>
            </div>
          )}
          
          {match.description && (
            <>
              <Divider orientation="left" plain>Match Details</Divider>
              <p className="match-description">{match.description}</p>
            </>
          )}
          
          <Divider orientation="left" plain>
            <TeamOutlined /> Teams
          </Divider>
          
          <div className="team-members-section">
            <Row gutter={16}>
              <Col span={12}>
                <div className={`team ${hasResult && match.result.winner === 'team1' ? 'winner-team' : hasResult ? 'loser-team' : ''}`}>
                  <h4 className="team-header">
                    {match.team1Name}
                    {hasResult && match.result.winner === 'team1' && (
                      <TrophyOutlined className="winner-icon" />
                    )}
                  </h4>
                  <List
                    size="small"
                    dataSource={match.team1Participants || []}
                    renderItem={playerId => {
                      const user = allUsers[playerId];
                      return (
                        <List.Item className="team-member-item">
                          <div className="avatar-name-role">
                            {getUserAvatar(user)}
                            <div className="member-info">
                              <strong>{user?.name || 'Unknown User'}</strong>
                              <div className="role-text">
                                ({user?.role || 'Player'})
                              </div>
                            </div>
                            {playerId === userId && (
                              <Tag color="blue" className="you-tag">You</Tag>
                            )}
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </Col>
              <Col span={12}>
                <div className={`team ${hasResult && match.result.winner === 'team2' ? 'winner-team' : hasResult ? 'loser-team' : ''}`}>
                  <h4 className="team-header">
                    {match.team2Name}
                    {hasResult && match.result.winner === 'team2' && (
                      <TrophyOutlined className="winner-icon" />
                    )}
                  </h4>
                  <List
                    size="small"
                    dataSource={match.team2Participants || []}
                    renderItem={playerId => {
                      const user = allUsers[playerId];
                      return (
                        <List.Item className="team-member-item">
                          <div className="avatar-name-role">
                            {getUserAvatar(user)}
                            <div className="member-info">
                              <strong>{user?.name || 'Unknown User'}</strong>
                              <div className="role-text">
                                ({user?.role || 'Player'})
                              </div>
                            </div>
                            {playerId === userId && (
                              <Tag color="blue" className="you-tag">You</Tag>
                            )}
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              </Col>
            </Row>
          </div>
        </div>
      </Card>
    );
  };

  const renderMatchesView = (isCoachView = false) => {
    const filteredMatches = selectedEvent 
      ? matches.filter(match => match.eventId === selectedEvent.id)
      : matches;

    // Sort matches by status and date
    const sortedMatches = filteredMatches.sort((a, b) => {
      const statusA = getMatchStatus(a);
      const statusB = getMatchStatus(b);
      
      // Priority order: finished (awaiting result) > today > upcoming > completed > past
      const statusPriority = {
        'finished': 1,
        'today': 2,
        'upcoming': 3,
        'completed': 4,
        'past': 5
      };
      
      if (statusPriority[statusA] !== statusPriority[statusB]) {
        return statusPriority[statusA] - statusPriority[statusB];
      }
      
      // If same status, sort by date
      return moment(a.matchDateTime).diff(moment(b.matchDateTime));
    });

    if (sortedMatches.length === 0) {
      return (
        <Empty 
          description={isCoachView ? 'No matches scheduled yet' : "You don't have any scheduled matches yet"} 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    return (
      <div className="matches-grid">
        {sortedMatches.map(match => renderMatchCard(match, isCoachView))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="matches-container">
      <div className="matches-header">
        <Title level={2}>
          {userType === 'coach' ? 'Matches Management' : 'My Matches'}
        </Title>
      </div>

      {userType === 'coach' && events.length > 0 && (
        <div className="event-selector">
          <h3>Filter by Event:</h3>
          <div className="filter-controls">
            <Select
              placeholder="Select an event"
              className="event-select"
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
              <Button type="link" onClick={() => setSelectedEvent(null)}>
                Clear Filter
              </Button>
            )}
          </div>
          {selectedEvent && (
            <div className="selected-event-info">
              <Tag color="blue">Showing matches for: {selectedEvent.title}</Tag>
            </div>
          )}
        </div>
      )}

      {userType === 'coach' ? renderMatchesView(true) : renderMatchesView()}

      <Modal
        title="Announce Match Result"
        open={resultModal.visible}
        onOk={submitResult}
        onCancel={() => setResultModal({ visible: false, match: null })}
        width={600}
        okText="Announce Result"
        cancelText="Cancel"
        className="result-modal"
      >
        {resultModal.match && (
          <div className="result-form">
            <div className="match-info-header">
              <h3>{resultModal.match.team1Name} vs {resultModal.match.team2Name}</h3>
              <Text type="secondary">{resultModal.match.eventName}</Text>
            </div>
            
            <Divider />
            
            <div className="form-section">
              <label className="form-label">Select Winner *</label>
              <Radio.Group 
                value={resultForm.winner} 
                onChange={(e) => setResultForm({...resultForm, winner: e.target.value})}
                className="winner-selection"
              >
                <Space direction="vertical" size="middle">
                  <Radio value="team1" className="team-radio">
                    <div className="team-option">
                      <TrophyOutlined />
                      <span>{resultModal.match.team1Name}</span>
                    </div>
                  </Radio>
                  <Radio value="team2" className="team-radio">
                    <div className="team-option">
                      <TrophyOutlined />
                      <span>{resultModal.match.team2Name}</span>
                    </div>
                  </Radio>
                </Space>
              </Radio.Group>
            </div>

            <div className="form-section">
              <label className="form-label">Score (Optional)</label>
              <Input
                placeholder="e.g., 3-1, 21-18, 2-0"
                value={resultForm.score}
                onChange={(e) => setResultForm({...resultForm, score: e.target.value})}
                className="score-input"
              />
            </div>

            <div className="form-section">
              <label className="form-label">Additional Notes (Optional)</label>
              <TextArea
                placeholder="Any additional information about the match..."
                value={resultForm.notes}
                onChange={(e) => setResultForm({...resultForm, notes: e.target.value})}
                rows={3}
                className="notes-input"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Matches;