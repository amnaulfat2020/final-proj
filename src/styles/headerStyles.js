const headerStyles = {
  container: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 20px',
    backgroundColor: 'white',
    borderBottom: '1px solid #f1f1f1',
    height: '64px',
  },
  userLink: {
    textDecoration: 'none',
    color: 'var(--primary-clr)',
    fontSize: '22px',
  },
  leftSection: {
    flex: 1,
  },
  centerSection: {
    flex: 2,
    display: 'flex',
    alignItems: 'center',
  },
  rightSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: '600',
    margin: '0 60px',
    color: 'var(--primary-clr)',
    '@media (max-width: 750px)': {
      display: 'none',
    },
  },
  searchInput: {
    width: '200px',
    marginLeft: '20px',
  },
  icon: {
    fontSize: '20px',
    cursor: 'pointer',
    marginLeft: '20px',
  },
  avatar: {
    cursor: 'pointer',
  },
  AdditonalMenuStyle: {
    display: 'flex',
  },
  AdditonalMenuStyleMain: {
    width: '80%',
    border: '1px solid #F1F2F7',
    marginTop: '10px'
  },
  ButtonStyle: {
    backgroundColor: '#00DB99',
    padding: '10px 40px 35px 20px',
    borderRadius: '26px',
    marginTop: '10px',
  },
  U_img: {
    width: "45px",
    cursor: "pointer"
  }
};

export default headerStyles;