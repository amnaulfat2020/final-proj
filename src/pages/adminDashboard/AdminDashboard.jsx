import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { db } from "../../utils/constants/Firebase";
import { Table, Button, Badge, Tabs, message, Modal, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

const { TabPane } = Tabs;
const { Title, Text } = Typography;

const AdminDashboard = () => {
  const [pendingCoaches, setPendingCoaches] = useState([]);
  const [pendingPlayers, setPendingPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is admin
    const adminEmail = localStorage.getItem("adminEmail");
    if (adminEmail !== "admin1@gmail.com") {
      message.error("Unauthorized access");
      navigate("/");
      return;
    }

    fetchPendingRequests();
  }, [navigate]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      
      // Fetch pending coach requests
      const coachQuery = query(
        collection(db, "users"),
        where("userType", "==", "coach"),
        where("status", "==", "pending")
      );
      const coachSnapshot = await getDocs(coachQuery);
      const coachRequests = [];
      coachSnapshot.forEach((doc) => {
        coachRequests.push({ id: doc.id, ...doc.data() });
      });
      
      // Fetch player requests
      const playerQuery = query(
        collection(db, "users"),
        where("userType", "==", "player")
      );
      const playerSnapshot = await getDocs(playerQuery);
      const playerRequests = [];
      playerSnapshot.forEach((doc) => {
        const playerData = doc.data();
        // Handle player game requests
        const playerWithRequests = { id: doc.id, ...playerData };
        
        // Check if the player has pending games (not in approvedGames)
        if (playerData.selectedGames && playerData.selectedGames.length > 0) {
          const approvedGames = playerData.approvedGames || [];
          const pendingGames = playerData.selectedGames.filter(game => !approvedGames.includes(game));
          
          if (pendingGames.length > 0) {
            playerWithRequests.pendingGames = pendingGames;
            playerWithRequests.approvedGames = approvedGames;
            playerRequests.push(playerWithRequests);
          }
        }
      });
      
      setPendingCoaches(coachRequests);
      setPendingPlayers(playerRequests);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      message.error("Failed to load pending requests");
      setLoading(false);
    }
  };

  const handleApproveCoach = async (coach) => {
    try {
      const userRef = doc(db, "users", coach.id);
      await updateDoc(userRef, {
        status: "approved"
      });
      
      message.success(`Coach ${coach.firstName} ${coach.lastName} approved successfully!`);
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error("Error approving coach:", error);
      message.error("Failed to approve coach");
    }
  };

  const handleRejectCoach = async (coach) => {
    try {
      const userRef = doc(db, "users", coach.id);
      await updateDoc(userRef, {
        status: "declined"
      });
      
      message.success(`Coach ${coach.firstName} ${coach.lastName} rejected.`);
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error("Error rejecting coach:", error);
      message.error("Failed to reject coach");
    }
  };

  const handlePlayerGameApproval = async (player, game, approve) => {
    try {
      const userRef = doc(db, "users", player.id);
      
      // Get current approved games
      const approvedGames = [...(player.approvedGames || [])];
      
      if (approve) {
        // Add game to approved games if not already there
        if (!approvedGames.includes(game)) {
          approvedGames.push(game);
        }
      } else {
        // Remove game from approved games
        const index = approvedGames.indexOf(game);
        if (index > -1) {
          approvedGames.splice(index, 1);
        }
      }
      
      // Update player document with new approved games
      await updateDoc(userRef, {
        approvedGames: approvedGames,
        // If at least one game is approved, set player status to approved
        status: approvedGames.length > 0 ? "approved" : "pending"
      });
      
      message.success(`Player ${player.firstName} ${player.lastName}'s game request ${approve ? 'approved' : 'rejected'}.`);
      fetchPendingRequests(); // Refresh the list
    } catch (error) {
      console.error("Error processing player game approval:", error);
      message.error("Failed to process player game approval");
    }
  };

  const showUserDetails = (user) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const coachColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: 'Email',
      dataIndex: 'id',
      key: 'email',
    },
    {
      title: 'Selected Game',
      key: 'selectedGames',
      render: (_, record) => record.selectedGames ? record.selectedGames.join(', ') : 'None',
    },
    {
      title: 'Registration Date',
      key: 'createdAt',
      render: (_, record) => record.createdAt ? record.createdAt.toDate().toLocaleDateString() : 'N/A',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div className="action-buttons">
          <Button type="primary" onClick={() => handleApproveCoach(record)}>
            Approve
          </Button>
          <Button type="danger" onClick={() => handleRejectCoach(record)}>
            Reject
          </Button>
          <Button type="default" onClick={() => showUserDetails(record)}>
            Details
          </Button>
        </div>
      ),
    },
  ];

  const playerColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: 'Email',
      dataIndex: 'id',
      key: 'email',
    },
    {
      title: 'Selected Games',
      key: 'selectedGames',
      render: (_, record) => record.selectedGames ? record.selectedGames.join(', ') : 'None',
    },
    {
      title: 'Approved Games',
      key: 'approvedGames',
      render: (_, record) => record.approvedGames ? record.approvedGames.join(', ') : 'None',
    },
    {
      title: 'Pending Games',
      key: 'pendingGames',
      render: (_, record) => {
        if (!record.pendingGames || record.pendingGames.length === 0) {
          return 'None';
        }
        
        return (
          <div>
            {record.pendingGames.map(game => (
              <div key={game} className="pending-game-item">
                <span>{game}</span>
                <Button 
                  type="primary" 
                  size="small" 
                  onClick={() => handlePlayerGameApproval(record, game, true)}
                >
                  Approve
                </Button>
                <Button 
                  type="danger" 
                  size="small" 
                  onClick={() => handlePlayerGameApproval(record, game, false)}
                >
                  Reject
                </Button>
              </div>
            ))}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="default" onClick={() => showUserDetails(record)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <Title level={2}>Admin Dashboard</Title>
        <Badge.Ribbon text="Admin Panel" color="gold" />
        <Button 
          type="primary" 
          onClick={() => {
            localStorage.removeItem("adminEmail");
            navigate("/");
          }}
          className="logout-button"
        >
          Logout
        </Button>
      </div>

      <Tabs defaultActiveKey="coaches">
        <TabPane tab={`Pending Coaches (${pendingCoaches.length})`} key="coaches">
          <Table 
            dataSource={pendingCoaches} 
            columns={coachColumns} 
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
        <TabPane tab={`Player Game Approvals (${pendingPlayers.length})`} key="players">
          <Table 
            dataSource={pendingPlayers} 
            columns={playerColumns} 
            loading={loading}
            rowKey="id"
            pagination={{ pageSize: 10 }}
          />
        </TabPane>
      </Tabs>

      {/* User Details Modal */}
      <Modal
        title="User Details"
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={600}
      >
        {selectedUser && (
          <div className="user-details">
            <div className="detail-item">
              <Text strong>Name:</Text> {selectedUser.firstName} {selectedUser.lastName}
            </div>
            <div className="detail-item">
              <Text strong>Email:</Text> {selectedUser.id}
            </div>
            <div className="detail-item">
              <Text strong>User Type:</Text> {selectedUser.userType}
            </div>
            <div className="detail-item">
              <Text strong>Status:</Text> {selectedUser.status}
            </div>
            <div className="detail-item">
              <Text strong>Selected Games:</Text> {selectedUser.selectedGames ? selectedUser.selectedGames.join(', ') : 'None'}
            </div>
            {selectedUser.approvedGames && (
              <div className="detail-item">
                <Text strong>Approved Games:</Text> {selectedUser.approvedGames.join(', ')}
              </div>
            )}
            <div className="detail-item">
              <Text strong>Registration Date:</Text> {selectedUser.createdAt ? selectedUser.createdAt.toDate().toLocaleDateString() : 'N/A'}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;