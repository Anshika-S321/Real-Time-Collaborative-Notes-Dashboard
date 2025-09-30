import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import Draggable from 'react-draggable'; // Optional: Remove if not using drag-and-drop

// Firebase Config - REPLACE WITH YOUR ACTUAL CONFIG
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

function App() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [currentUser , setCurrentUser ] = useState(null);
  const [loading, setLoading] = useState(true);

  // Anonymous Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userData = {
          id: user.uid,
          name: `User  ${Math.floor(Math.random() * 1000)}`, // Random for demo
          color: `#${Math.floor(Math.random() * 16777215).toString(16)}` // Random color
        };
        setCurrentUser (userData);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Real-Time Listener for Notes
  useEffect(() => {
    if (!currentUser ) return;

    const notesRef = ref(db, 'notes');
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notesArray = Object.entries(data).map(([id, note]) => ({ id, ...note }));
        setNotes(notesArray.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))); // Newest first
      } else {
        setNotes([]);
      }
    });

    return unsubscribe;
  }, [currentUser ]);

  // Add New Note
  const addNote = async () => {
    if (!newNote.trim() || !currentUser ) return;

    const notesRef = ref(db, 'notes');
    const newNoteRef = push(notesRef);
    await set(newNoteRef, {
      text: newNote,
      userId: currentUser .id,
      userName: currentUser .name,
      color: currentUser .color,
      timestamp: serverTimestamp()
    });

    setNewNote('');
  };

  // Delete Note (Optional: Add edit if needed)
  const deleteNote = async (noteId) => {
    const noteRef = ref(db, `notes/${noteId}`);
    await set(noteRef, null); // Removes from Firebase
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="bg-white rounded-lg shadow-md p-6 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Real-Time Collaborative Notes Dashboard</h1>
            <p className="text-gray-600 mt-1">Add notes that sync instantly across users. You're logged in as: <span className="font-semibold" style={{ color: currentUser ?.color }}>{currentUser ?.name}</span></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Type a new note..."
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNote()}
            />
            <button
              onClick={addNote}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              disabled={!newNote.trim()}
            >
              Add Note
            </button>
          </div>
        </header>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">No notes yet. Add one above to start collaborating!</p>
            </div>
          ) : (
            notes.map((note) => (
              <DraggableNote key={note.id} note={note} onDelete={deleteNote} currentUser ={currentUser } />
            ))
          )}
        </div>

        {/* Footer: Active Notes Count */}
        <footer className="mt-6 text-center text-gray-600">
          Total Notes: {notes.length} | Collaborating in real-time via Firebase
        </footer>
      </div>
    </div>
  );
}

// Optional: Draggable Note Component (Uncomment the import and use if desired)
const DraggableNote = ({ note, onDelete, currentUser  }) => {
  const canDelete = note.userId === currentUser ?.id; // Only owner can delete

  return (
    <Draggable defaultPosition={{ x: 0, y: 0 }} bounds="parent">
      {(provided) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow relative min-h-[100px]"
          style={{
            ...provided.draggableProps.style,
            borderLeft: `4px solid ${note.color}`,
            backgroundColor: note.color + '20' // Semi-transparent
          }}
        >
          <p className="text-gray-800 mb-2 whitespace-pre-wrap">{note.text}</p>
          <div className="text-xs text-gray-500 flex justify-between items-center">
            <span>By {note.userName} • {note.timestamp ? new Date(note.timestamp).toLocaleString() : 'Just now'}</span>
            {canDelete && (
              <button
                onClick={() => onDelete(note.id)}
                className="text-red-500 hover:text-red-700 ml-2"
              >
                ×
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};

// For non-draggable version, replace DraggableNote with:
const StaticNote = ({ note, onDelete, currentUser  }) => {
  const canDelete = note.userId === currentUser ?.id;

  return (
    <div
      className="bg-yellow-100 border-2 border-yellow-300 rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow relative min-h-[100px]"
      style={{ borderLeft: `4px solid ${note.color}` }}
    >
      <p className="text-gray-800 mb-2 whitespace-pre-wrap">{note.text}</p>
      <div className="text-xs text-gray-500 flex justify-between items-center">
        <span>By {note.userName} • {note.timestamp ? new Date(note.timestamp).toLocaleString() : 'Just now'}</span>
        {canDelete && (
          <button
            onClick={() => onDelete(note.id)}
            className="text-red-500 hover:text-red-700 ml-2"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};

export default App;

