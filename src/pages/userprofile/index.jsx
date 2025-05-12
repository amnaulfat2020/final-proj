import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Input, message, Tag, Select } from "antd";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../utils/constants/Firebase";
import "./userprofile.css";

const UserProfilePopup = ({ userData, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { Option } = Select;

  // Initialize form with current data
  useEffect(() => {
    form.setFieldsValue({
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      bloodGroup: userData.bloodGroup || ''
    });
  }, [userData, form]);

  const handleSave = async () => {
  try {
    setLoading(true);
    const values = await form.validateFields();
    
    // Prepare update data, excluding undefined values
    const updateData = {
      firstName: values.firstName,
      lastName: values.lastName,
      ...(values.bloodGroup && { bloodGroup: values.bloodGroup }) // Only include if exists
    };

    const userRef = doc(db, "users", userData.email);
    await updateDoc(userRef, updateData);
    
    onUpdate({
      ...userData,
      ...updateData
    });
    
    message.success("Profile updated successfully!");
    setIsEditing(false);
  } catch (error) {
    console.error("Update error:", error);
    message.error(`Failed to update profile: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
  return (
    <Modal
      title="User Profile"
      open={true}
      onCancel={onClose}
      footer={[
        !isEditing ? (
          <Button type="primary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <>
            <Button onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button 
              type="primary" 
              loading={loading}
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </>
        )
      ]}
      width={700}
    >
      <Form form={form} layout="vertical">
        {/* Beautiful Name Fields Container */}
        <div className="name-field-container">
          {/* First Name Field */}
          <div className="name-field">
            <div className="name-label">First Name</div>
            {isEditing ? (
              <Form.Item name="firstName" rules={[{ required: true }]}>
                <Input className="name-input" />
              </Form.Item>
            ) : (
              <div className="name-value">{userData.firstName}</div>
            )}
          </div>
          
          {/* Last Name Field */}
          <div className="name-field">
            <div className="name-label">Last Name</div>
            {isEditing ? (
              <Form.Item name="lastName" rules={[{ required: true }]}>
                <Input className="name-input" />
              </Form.Item>
            ) : (
              <div className="name-value">{userData.lastName}</div>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div className="email-field profile-field-container">
          <div className="profile-label email-label">Email</div>
          <div className="profile-value email-value">{userData.email}</div>
        </div>

        {/* Blood Group Field
        <div className="profile-field-container">
          <div className="profile-label">Blood Group</div>
          {isEditing ? (
            <Form.Item name="bloodGroup">
              <Select className="profile-select">
                <Option value="A+">A+</Option>
                <Option value="A-">A-</Option>
                <Option value="B+">B+</Option>
                <Option value="B-">B-</Option>
                <Option value="AB+">AB+</Option>
                <Option value="AB-">AB-</Option>
                <Option value="O+">O+</Option>
                <Option value="O-">O-</Option>
              </Select>
            </Form.Item>
          ) : (
            <div className="profile-value">{userData.bloodGroup || "Not specified"}</div>
          )}
        </div> */}

        {/* Role Field */}
        <div className="role-field profile-field-container">
          <div className="profile-label role-label">Role</div>
          <div className="profile-value role-value capitalize">
            {userData.userType || "player"}
          </div>
        </div>

        {/* Games Field */}
        <div className="games-field profile-field-container">
          <div className="profile-label games-label">
            {userData.userType === "player" ? "Playing" : "Coaching"}
          </div>
          <div className="games-container">
            {userData.selectedGames?.map((game, i) => (
              <Tag color="green" key={i}>{game}</Tag>
            ))}
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default UserProfilePopup;