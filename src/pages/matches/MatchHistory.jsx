import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../utils/constants/Firebase';
import { 
  Card, Tag, Spin, List,
  Divider, Row, Col, Typography, Avatar,
  Table, Empty, Alert
} from 'antd';
import { 
  TeamOutlined, TrophyOutlined, 
  CalendarOutlined, ClockCircleOutlined,
  CrownOutlined, EyeOutlined
} from '@ant-design/icons';
import moment from 'moment';
import './matches.css';

const { Title, Text } = Typography;

const MatchHistory = () => {
  const { userId } = useParams();
  const [loading, setLoading] = useState(true);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [allUsers, setAllUsers] = useState({});
  const [teams, setTeams] = useState([]);
  const [userType, setUserType] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch user data to determine user type
        const userQuery = query(collection(db, 'users'), where('uniqueId', '==', userId));
        const userSnapshot = await getDocs(userQuery);
        
        if (userSnapshot.empty) {
          console.error('User not found');
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
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || doc.id,
              photoURL: user.photoURL || null
            };
          }
        });
        setAllUsers(usersMap);
        
        // Fetch ALL completed matches (remove participant filter)
        const matchesQuery = query(
          collection(db, 'matches'),
          where('status', '==', 'completed')
        );
        
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = [];
        matchesSnapshot.forEach((doc) => {
          matchesData.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by date (newest first)
        matchesData.sort((a, b) => 
          moment(b.result.announcedAt).diff(moment(a.result.announcedAt))
        );
        
        setCompletedMatches(matchesData);
        
        // Fetch all teams (remove participant filter)
        const teamsQuery = query(collection(db, 'teams'));
        const teamsSnapshot = await getDocs(teamsQuery);
        const teamsData = [];
        teamsSnapshot.forEach((doc) => {
          teamsData.push({ id: doc.id, ...doc.data() });
        });
        setTeams(teamsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return { date: 'Not scheduled', time: '' };
    
    const matchDateTime = moment(dateTimeString);
    const date = matchDateTime.format('MMM DD, YYYY');
    const time = matchDateTime.format('hh:mm A');
    
    return { date, time };
  };

  const getUserAvatar = (user) => {
    if (user?.photoURL) {
      return <Avatar src={user.photoURL} />;
    }
    return <Avatar>{user?.name?.[0] || '?'}</Avatar>;
  };

  const wasUserInMatch = (match) => {
    if (userType === 'coach') {
      return match.createdBy === userId;
    }
    return match.participants?.includes(userId) || 
           match.team1Participants?.includes(userId) || 
           match.team2Participants?.includes(userId);
  };

  const columns = [
    {
      title: 'Match',
      dataIndex: 'match',
      key: 'match',
      render: (_, record) => (
        <div>
          <strong>{record.team1Name} vs {record.team2Name}</strong>
          <div>{record.eventName}</div>
          {!wasUserInMatch(record) && (
            <Tag icon={<EyeOutlined />} color="default">
              Observer
            </Tag>
          )}
        </div>
      )
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (_, record) => {
        const { date } = formatDateTime(record.matchDateTime);
        return date;
      }
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (_, record) => (
        <div>
          <Tag icon={<CrownOutlined />} color="gold">
            {record.result.winnerTeamName} won
          </Tag>
          {record.result.score && (
            <div>Score: {record.result.score}</div>
          )}
        </div>
      )
    },
    {
      title: 'Announced On',
      dataIndex: 'announcedAt',
      key: 'announcedAt',
      render: (_, record) => (
        moment(record.result.announcedAt).format('MMM DD, YYYY')
      )
    }
  ];

  if (loading) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <p>Loading match history...</p>
      </div>
    );
  }

  return (
    <div className="match-history-container">
      <div className="match-history-header">
        <Title level={2}>Match History</Title>
        <Text type="secondary">
          View all completed matches in the system
        </Text>
        <Alert 
          message="You can view all matches, not just those you participated in"
          type="info" 
          showIcon
          style={{ marginTop: 16 }}
        />
      </div>

      <div className="match-history-content">
        {completedMatches.length === 0 ? (
          <div className="empty-history">
            <Empty description="No completed matches found in the system" />
          </div>
        ) : (
          <>
            <div className="matches-table">
              <Table 
                columns={columns} 
                dataSource={completedMatches} 
                rowKey="id"
                pagination={{ pageSize: 10 }}
                expandable={{
                  expandedRowRender: (record) => (
                    <div className="expanded-row">
                      <Divider orientation="left">Match Details</Divider>
                      <Row gutter={16}>
                        <Col span={12}>
                          <div className="team-details">
                            <h4>
                              {record.team1Name}
                              {record.result.winner === 'team1' && (
                                <CrownOutlined style={{ color: 'gold', marginLeft: 8 }} />
                              )}
                            </h4>
                            <List
                              size="small"
                              dataSource={record.team1Participants || []}
                              renderItem={playerId => {
                                const user = allUsers[playerId];
                                return (
                                  <List.Item>
                                    <div className="player-info">
                                      {getUserAvatar(user)}
                                      <span style={{ marginLeft: 8 }}>
                                        {user?.name || 'Unknown Player'}
                                        {playerId === userId && (
                                          <Tag color="blue" style={{ marginLeft: 8 }}>You</Tag>
                                        )}
                                      </span>
                                    </div>
                                  </List.Item>
                                );
                              }}
                            />
                          </div>
                        </Col>
                        <Col span={12}>
                          <div className="team-details">
                            <h4>
                              {record.team2Name}
                              {record.result.winner === 'team2' && (
                                <CrownOutlined style={{ color: 'gold', marginLeft: 8 }} />
                              )}
                            </h4>
                            <List
                              size="small"
                              dataSource={record.team2Participants || []}
                              renderItem={playerId => {
                                const user = allUsers[playerId];
                                return (
                                  <List.Item>
                                    <div className="player-info">
                                      {getUserAvatar(user)}
                                      <span style={{ marginLeft: 8 }}>
                                        {user?.name || 'Unknown Player'}
                                        {playerId === userId && (
                                          <Tag color="blue" style={{ marginLeft: 8 }}>You</Tag>
                                        )}
                                      </span>
                                    </div>
                                  </List.Item>
                                );
                              }}
                            />
                          </div>
                        </Col>
                      </Row>
                      {record.result.notes && (
                        <>
                          <Divider orientation="left">Match Notes</Divider>
                          <div className="match-notes">
                            {record.result.notes}
                          </div>
                        </>
                      )}
                    </div>
                  ),
                  rowExpandable: (record) => true,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MatchHistory;