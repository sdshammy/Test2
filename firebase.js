// Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyCzQKj6bhgu1ZN5SODq-6RNRJ7r0SzCmVM",
  authDomain: "think-tank-4cd9c.firebaseapp.com",
  projectId: "think-tank-4cd9c",
  storageBucket: "think-tank-4cd9c.firebasestorage.app",
  messagingSenderId: "985368175611",
  appId: "1:985368175611:web:9ec4bd343a3e119bdae15e",
  measurementId: "G-J5SFW73N0S"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Enable offline persistence
db.enablePersistence()
  .catch((err) => {
      console.log("Firebase persistence error: ", err);
  });

// Export services
export { db, auth, storage };