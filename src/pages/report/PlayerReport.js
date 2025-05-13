import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Progress, 
  Divider,
  Avatar,
  Row,
  Col,
  Statistic,
  Table,
  message
} from 'antd';
import { 
  FilePdfOutlined,
  UserOutlined,
  ArrowLeftOutlined,
  DownloadOutlined,
  PrinterOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../utils/constants/Firebase';
import { doc, getDoc } from 'firebase/firestore';
import './playerReport.css';

const { Title, Text } = Typography;

const PlayerReport = () => {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const { userId, playerId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const playerRef = doc(db, 'users', playerId);
        const playerDoc = await getDoc(playerRef);
        
        if (playerDoc.exists()) {
          setPlayer({ id: playerDoc.id, ...playerDoc.data() });
        } else {
          message.error('Player not found');
          navigate(-1);
        }
      } catch (error) {
        console.error('Error fetching player data:', error);
        message.error('Failed to load player data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, navigate]);

  const evaluationCriteria = [
    { name: 'Technical Skills', key: 'technical' },
    { name: 'Physical Fitness', key: 'physical' },
    { name: 'Tactical Understanding', key: 'tactical' },
    { name: 'Mental Toughness', key: 'mental' },
    { name: 'Teamwork', key: 'teamwork' },
    { name: 'Discipline', key: 'discipline' }
  ];

  const calculateAverageScores = () => {
    if (!player?.evaluations || player.evaluations.length === 0) return null;
    
    const averages = {};
    evaluationCriteria.forEach(criteria => {
      averages[criteria.key] = 0;
    });
    
    player.evaluations.forEach(evaluation => {  // Changed from 'eval' to 'evaluation'
      evaluationCriteria.forEach(criteria => {
        averages[criteria.key] += evaluation[criteria.key];
      });
    });
    
    evaluationCriteria.forEach(criteria => {
      averages[criteria.key] = Math.round(averages[criteria.key] / player.evaluations.length);
    });
    
    return averages;
  };

  const averageScores = calculateAverageScores();

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    message.info('PDF download functionality will be implemented');
  };

  const handleShare = () => {
    message.info('Share functionality will be implemented');
  };

  return (
    <div className="player-report-container">
      <Button 
        type="text" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16 }}
      >
        Back to Evaluations
      </Button>

      {loading ? (
        <Card loading={true} />
      ) : player ? (
        <Card className="report-card">
          <div className="report-header">
            <Space size="large">
              <Avatar size={64} src={player.photoURL} icon={<UserOutlined />} />
              <div>
                <Title level={2}>{player.name}</Title>
                <Text type="secondary">{player.email}</Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color={player.skillLevel === 'Advanced' ? 'green' : player.skillLevel === 'Intermediate' ? 'orange' : 'blue'}>
                    {player.skillLevel || 'Not specified'}
                  </Tag>
                  {player.teams && player.teams.length > 0 && (
                    <Tag color="purple">Team: {player.teams.join(', ')}</Tag>
                  )}
                </div>
              </div>
            </Space>
            
            <Space className="report-actions">
              <Button icon={<DownloadOutlined />} onClick={handleDownloadPDF}>Download PDF</Button>
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
              <Button icon={<ShareAltOutlined />} onClick={handleShare}>Share</Button>
            </Space>
          </div>

          <Divider />

          <div className="report-summary">
            <Title level={4}>Performance Summary</Title>
            <Row gutter={16} style={{ marginTop: 24 }}>
              <Col span={8}>
                <Card>
                  <Statistic 
                    title="Total Evaluations" 
                    value={player.evaluations?.length || 0} 
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic 
                    title="Average Score" 
                    value={averageScores ? 
                      Math.round(Object.values(averageScores).reduce((a, b) => a + b, 0) / evaluationCriteria.length) : 
                      'N/A'} 
                    suffix="/100"
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic 
                    title="Last Evaluation" 
                    value={player.evaluations?.length ? 
                      new Date(player.evaluations[player.evaluations.length - 1].date).toLocaleDateString() : 
                      'N/A'} 
                  />
                </Card>
              </Col>
            </Row>
          </div>

          <Divider />

          <div className="skill-breakdown">
            <Title level={4}>Skill Breakdown</Title>
            {averageScores ? (
              <div className="skill-charts">
                {evaluationCriteria.map(criteria => (
                  <div key={criteria.key} className="skill-item">
                    <Text strong>{criteria.name}</Text>
                    <Progress 
                      percent={averageScores[criteria.key]} 
                      status={averageScores[criteria.key] >= 70 ? 'success' : 
                             averageScores[criteria.key] >= 40 ? 'normal' : 'exception'}
                      strokeWidth={12}
                      format={percent => `${percent}%`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <Text type="secondary">No evaluation data available</Text>
            )}
          </div>

          {player.evaluations?.length > 0 && (
            <>
              <Divider />
              <div className="evaluation-history">
                <Title level={4}>Evaluation History</Title>
                <Table 
                  columns={[
                    {
                      title: 'Date',
                      dataIndex: 'date',
                      key: 'date',
                      render: date => new Date(date).toLocaleDateString(),
                    },
                    ...evaluationCriteria.map(criteria => ({
                      title: criteria.name,
                      dataIndex: criteria.key,
                      key: criteria.key,
                      render: value => (
                        <Progress 
                          percent={value} 
                          status={value >= 70 ? 'success' : value >= 40 ? 'normal' : 'exception'}
                          showInfo={false}
                          size="small"
                        />
                      ),
                    })),
                    {
                      title: 'Evaluator',
                      dataIndex: 'evaluatedBy',
                      key: 'evaluatedBy',
                    }
                  ]}
                  dataSource={player.evaluations}
                  rowKey="date"
                  pagination={false}
                />
              </div>
            </>
          )}

          <Divider />

          <div className="recommendations">
            <Title level={4}>Training Recommendations</Title>
            {averageScores ? (
              <div className="recommendation-list">
                {evaluationCriteria
                  .filter(criteria => averageScores[criteria.key] < 70)
                  .map(criteria => (
                    <Card key={criteria.key} size="small" style={{ marginBottom: 8 }}>
                      <Text strong>{criteria.name} Improvement:</Text>
                      <Text> {getRecommendationText(criteria.key, averageScores[criteria.key])}</Text>
                    </Card>
                  ))
                }
                {evaluationCriteria.every(criteria => averageScores[criteria.key] >= 70) && (
                  <Text type="success">Player is performing well in all areas. Maintain current training regimen.</Text>
                )}
              </div>
            ) : (
              <Text type="secondary">No recommendations available without evaluation data</Text>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <Text>Player data not available</Text>
        </Card>
      )}
    </div>
  );
};

// Helper function for recommendations
const getRecommendationText = (skill, score) => {
  const recommendations = {
    technical: [
      "Focus on fundamental drills to improve technique",
      "Incorporate sport-specific skill training",
      "Work with a skills coach for personalized feedback"
    ],
    physical: [
      "Implement a strength and conditioning program",
      "Focus on cardiovascular endurance training",
      "Include flexibility and mobility exercises"
    ],
    tactical: [
      "Study game film to improve decision making",
      "Participate in strategy sessions",
      "Practice game scenarios in training"
    ],
    mental: [
      "Work with a sports psychologist",
      "Practice visualization techniques",
      "Develop pre-performance routines"
    ],
    teamwork: [
      "Participate in team-building exercises",
      "Focus on communication skills",
      "Study team dynamics and positioning"
    ],
    discipline: [
      "Set clear performance goals",
      "Track training consistency",
      "Develop time management strategies"
    ]
  };

  if (score >= 70) return "Maintain current training focus";
  if (score >= 40) return recommendations[skill][1];
  return recommendations[skill][0];
};

export default PlayerReport;