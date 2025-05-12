

import React, { createContext, useContext, useState, useEffect } from 'react';

const SearchContext = createContext();
const MenuContext = createContext();
const UserContext = createContext();

export const useSearch = () => useContext(SearchContext);
export const useMenuContext = () => useContext(MenuContext);
export const useUserContext = () => useContext(UserContext);

export const SearchProvider = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuFilter, setMenuFilter] = useState('All');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    imageUrl: '', // You can store the user's image URL here
    title: '', // Add a title property for user's title
    tasks: 0, // Add properties for user tasks, team, and completedTasks
    team: 0,
    completedTasks: 0,
  });

  const setSearch = (query) => {
    setSearchQuery(query);
  };

  

  const updateUser = (user) => {
    // Update the user data when the user logs in
    setUserData({
      name: user.displayName,
      email: user.email,
      imageUrl: user.photoURL,
      title: 'Profile', // Replace with the user's actual title
      tasks: 0, // Initialize with appropriate values
      team: 0,
      completedTasks: 0,
      
    });
  };
  

  return (
    <SearchContext.Provider value={{ searchQuery, setSearch, menuFilter, setMenuFilter }}>
      <MenuContext.Provider value={{ menuFilter, setMenuFilter }}>
        <UserContext.Provider value={{ userData, updateUser }}>
          {props.children}
        </UserContext.Provider>
      </MenuContext.Provider>
    </SearchContext.Provider>
  );
};
