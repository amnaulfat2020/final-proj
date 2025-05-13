import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Typography, 
  Space, 
  Tag, 
  Input, 
  Select, 
  Progress, 
  Divider,
  Modal,
  Form,
  message,
  Avatar
} from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  PlusOutlined,
  EditOutlined,
  FilePdfOutlined,
  UserOutlined,
  FormOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../utils/constants/Firebase';
import { collection, getDocs, doc, getDoc, updateDoc, query, where, arrayUnion } from 'firebase/firestore';
import './playerEvaluation.css';

const { Title, Text } = Typography;
const { Option } = Select;

const PlayerEvaluation = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [evaluationModalVisible, setEvaluationModalVisible] = useState(false);
  const [evaluationForm] = Form.useForm();
  const [currentEvaluations, setCurrentEvaluations] = useState([]);
  const { userId } = useParams();
  const navigate = useNavigate();

  // Sample evaluation criteria
  const evaluationCriteria = [
    { name: 'Technical Skills', key: 'technical' },
    { name: 'Physical Fitness', key: 'physical' },
    { name: 'Tactical Understanding', key: 'tactical' },
    { name: 'Mental Toughness', key: 'mental' },
    { name: 'Teamwork', key: 'teamwork' },
    { name: 'Discipline', key: 'discipline' }
  ];

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        // Fetch players from your database
        const playersRef = collection(db, 'users');
        const q = query(playersRef, where('userType', '==', 'player'));
        const querySnapshot = await getDocs(q);
        
        const playersData = [];
        querySnapshot.forEach((doc) => {
          playersData.push({ id: doc.id, ...doc.data() });
        });
        
        setPlayers(playersData);
        setFilteredPlayers(playersData);
      } catch (error) {
        console.error('Error fetching players:', error);
        message.error('Failed to load players');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  const handleSearch = (value) => {
    if (value) {
      const filtered = players.filter(player => 
        player.name?.toLowerCase().includes(value.toLowerCase()) ||
        player.email?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers(players);
    }
  };

  const handleFilter = (value) => {
    if (value === 'all') {
      setFilteredPlayers(players);
    } else {
      const filtered = players.filter(player => 
        player.skillLevel === value
      );
      setFilteredPlayers(filtered);
    }
  };

  const handleEvaluatePlayer = async (player) => {
    setSelectedPlayer(player);
    
    try {
      // Fetch existing evaluations for this player
      const playerRef = doc(db, 'users', player.id);
      const playerDoc = await getDoc(playerRef);
      
      if (playerDoc.exists()) {
        const playerData = playerDoc.data();
        setCurrentEvaluations(playerData.evaluations || []);
        
        // If there are evaluations, pre-fill the form with the latest one
        if (playerData.evaluations && playerData.evaluations.length > 0) {
          const latestEvaluation = playerData.evaluations[playerData.evaluations.length - 1];
          evaluationForm.setFieldsValue(latestEvaluation);
        } else {
          evaluationForm.resetFields();
        }
      }
      
      setEvaluationModalVisible(true);
    } catch (error) {
      console.error('Error fetching player evaluations:', error);
      message.error('Failed to load player evaluations');
    }
  };

  const handleSubmitEvaluation = async () => {
    try {
      const values = await evaluationForm.validateFields();
      const evaluationData = {
        ...values,
        date: new Date().toISOString(),
        evaluatedBy: userId
      };
      
      // Update player document with new evaluation
      const playerRef = doc(db, 'users', selectedPlayer.id);
      await updateDoc(playerRef, {
        evaluations: arrayUnion(evaluationData)
      });
      
      message.success('Evaluation submitted successfully');
      setEvaluationModalVisible(false);
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      message.error('Failed to submit evaluation');
    }
  };

  const columns = [
    {
      title: 'Player',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar src={record.photoURL} icon={<UserOutlined />} />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Skill Level',
      dataIndex: 'skillLevel',
      key: 'skillLevel',
      render: (level) => {
        let color = '';
        if (level === 'Beginner') color = 'blue';
        if (level === 'Intermediate') color = 'orange';
        if (level === 'Advanced') color = 'green';
        return <Tag color={color}>{level}</Tag>;
      },
    },
    {
      title: 'Last Evaluation',
      dataIndex: 'evaluations',
      key: 'lastEvaluation',
      render: (evaluations) => {
        if (!evaluations || evaluations.length === 0) {
          return <Text type="secondary">Not evaluated yet</Text>;
        }
        const lastEval = evaluations[evaluations.length - 1];
        const totalScore = (lastEval.technical + lastEval.physical + lastEval.tactical + 
                         lastEval.mental + lastEval.teamwork + lastEval.discipline) / 6;
        return <Progress percent={Math.round(totalScore)} size="small" />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => handleEvaluatePlayer(record)}
          >
            Evaluate
          </Button>
          <Button 
            icon={<FilePdfOutlined />} 
            onClick={() => navigate(`/dashboard/player-report/${userId}/${record.id}`)}
          >
            Report
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="player-evaluation-container">
      <Card>
        <div className="evaluation-header">
          <Title level={3}>Player Evaluations</Title>
          <Space>
            <Input 
              placeholder="Search players..." 
              prefix={<SearchOutlined />} 
              onChange={(e) => handleSearch(e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Filter by skill"
              style={{ width: 150 }}
              onChange={handleFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">All Players</Option>
              <Option value="Beginner">Beginner</Option>
              <Option value="Intermediate">Intermediate</Option>
              <Option value="Advanced">Advanced</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />}>
              New Evaluation
            </Button>
          </Space>
        </div>

        <Divider />

        <Table 
          columns={columns} 
          dataSource={filteredPlayers} 
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </Card>

      {/* Evaluation Modal */}
      <Modal
        title={`Evaluate Player: ${selectedPlayer?.name || ''}`}
        visible={evaluationModalVisible}
        onCancel={() => setEvaluationModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setEvaluationModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            onClick={handleSubmitEvaluation}
          >
            Submit Evaluation
          </Button>,
        ]}
      >
        <Form form={evaluationForm} layout="vertical">
          {evaluationCriteria.map(criteria => (
            <Form.Item
              key={criteria.key}
              name={criteria.key}
              label={`${criteria.name} (0-100)`}
              rules={[{ required: true, message: 'Please provide a score' }]}
            >
              <Input type="number" min={0} max={100} />
            </Form.Item>
          ))}
          
          <Form.Item name="comments" label="Comments">
            <Input.TextArea rows={4} placeholder="Additional comments..." />
          </Form.Item>
        </Form>

        {currentEvaluations.length > 0 && (
          <>
            <Divider>Evaluation History</Divider>
            <div className="evaluation-history">
              {currentEvaluations.map((evaluation, index) => (
                <Card key={index} size="small" style={{ marginBottom: 16 }}>
                  <Text strong>Evaluation on {new Date(evaluation.date).toLocaleDateString()}</Text>
                  <div className="eval-scores">
                    {evaluationCriteria.map(criteria => (
                      <div key={criteria.key} className="eval-score-item">
                        <Text>{criteria.name}:</Text>
                        <Progress 
                          percent={evaluation[criteria.key]} 
                          status={evaluation[criteria.key] >= 70 ? 'success' : evaluation[criteria.key] >= 40 ? 'normal' : 'exception'}
                          showInfo={false}
                          style={{ width: 200, marginLeft: 16 }}
                        />
                        <Text strong>{evaluation[criteria.key]}/100</Text>
                      </div>
                    ))}
                  </div>
                  {evaluation.comments && (
                    <div className="eval-comments">
                      <Text type="secondary">Comments: {evaluation.comments}</Text>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default PlayerEvaluation;