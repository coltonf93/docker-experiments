import React, {useEffect, useState} from 'react';
import { API_BASE_URL } from './config'; // http://api/api in Docker
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [dataSource, setDataSource] = useState ("unknown");

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = () => {
        fetch(`${API_BASE_URL}/tasks`)
            .then(res => {
                const dataSource = res.headers.get("X-Data-Source");
                setDataSource(dataSource);
                return res.json();
            })
            .then(data => {
                setTasks(data.map(t => ({ ...t, isEditing: false })));
            })
            .catch(err => console.error(err));
    };

    const addTask = (text) => {
        fetch(`${API_BASE_URL}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, completed: false })
        })
            .then(res => res.json())
            .then(newTask => setTasks(prev => [...prev, { ...newTask, isEditing: false }]))
            .catch(err => console.error(err));
    };

    const removeTask = (id) => {
        fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'DELETE'
        })
            .then(res => {
                if (res.ok) {
                    setTasks(prev => prev.filter(task => task.id !== id));
                } else {
                    console.error("Failed to delete task");
                }
            })
            .catch(err => console.error(err));
    };

    const startEditing = (id) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, isEditing: true } : task
        ));
    };

    const cancelEditing = (id) => {
        setTasks(prev => prev.map(task =>
            task.id === id ? { ...task, isEditing: false } : task
        ));
    };

    const saveTask = (id, newText) => {
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        const updatedText = newText.trim() !== '' ? newText : taskToUpdate.text;

        fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: updatedText, completed: taskToUpdate.completed })
        })
            .then(res => res.json())
            .then(updatedTaskFromServer => {
                setTasks(prev => prev.map(task =>
                    task.id === id ? { ...updatedTaskFromServer, isEditing: false } : task
                ));
            })
            .catch(err => console.error(err));
    };

    const toggleCompletion = (id) => {
        const taskToUpdate = tasks.find(t => t.id === id);
        if (!taskToUpdate) return;

        const newCompletedState = !taskToUpdate.completed;
        fetch(`${API_BASE_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: taskToUpdate.text, completed: newCompletedState })
        })
            .then(res => res.json())
            .then(updatedTaskFromServer => {
                setTasks(prev => prev.map(task =>
                    task.id === id ? { ...updatedTaskFromServer, isEditing: task.isEditing } : task
                ));
            })
            .catch(err => console.error(err));
    };

    const incompleteTasks = tasks.filter(task => !task.completed);
    const completedTasks = tasks.filter(task => task.completed);

    return (
        <div className="App">
            <h1>To-Do List</h1>

            <div className="data-source-indicator">
                Loaded from: {dataSource}
                <button
                    className="refresh-btn"
                    onClick={fetchTasks}
                    aria-label="Refresh tasks"
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#555',
                        cursor: 'pointer',
                        marginLeft: '0.5rem',
                        fontSize: '0.9rem'
                    }}
                >
                    ↻
                </button>
            </div>

            {/* Task Form for adding new tasks */}
            <TaskForm onAddTask={addTask}/>

            {/* Show toggle only if at least one task exists */}
            {tasks.length > 0 && (
                <ToggleCompletedControl
                    showCompleted={showCompleted}
                    onToggle={setShowCompleted}
                />
            )}

            {/* Incomplete Tasks */}
            <TaskList
                tasks={incompleteTasks}
                allTasks={tasks}
                onStartEditing={startEditing}
                onCancelEditing={cancelEditing}
                onSaveTask={saveTask}
                onRemoveTask={removeTask}
                onToggleCompletion={toggleCompletion}
            />

            {/* Completed Tasks (conditionally shown) */}
            {showCompleted && completedTasks.length > 0 && (
                <>
                    <div className="separator">Completed Tasks</div>
                    <TaskList
                        tasks={completedTasks}
                        allTasks={tasks}
                        onStartEditing={startEditing}
                        onCancelEditing={cancelEditing}
                        onSaveTask={saveTask}
                        onRemoveTask={removeTask}
                        onToggleCompletion={toggleCompletion}
                    />
                </>
            )}
        </div>
    );
}

/**
 * TaskForm Component
 * Responsible for handling input for adding new tasks.
 */
function TaskForm({onAddTask}) {
    const [newTask, setNewTask] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newTask.trim() !== '') {
            onAddTask(newTask);
            setNewTask('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="task-form">
            <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Enter a task"
            />
            <button type="submit">Add</button>
        </form>
    );
}

/**
 * ToggleCompletedControl Component
 * Allows user to show/hide completed tasks.
 */
function ToggleCompletedControl({ showCompleted, onToggle }) {
    return (
        <div className="toggle-completed-container">
            <label className="toggle-completed-label">
                <input
                    type="checkbox"
                    checked={showCompleted}
                    onChange={(e) => onToggle(e.target.checked)}
                />
                Show Completed Tasks
            </label>
        </div>
    );
}

/**
 * TaskList Component
 * Renders a list of tasks passed as props.
 */
function TaskList({
                      tasks,
                      allTasks,
                      onStartEditing,
                      onCancelEditing,
                      onSaveTask,
                      onRemoveTask,
                      onToggleCompletion
                  }) {
    return (
        <ul className="task-list">
            {tasks.map((task) => {
                return (
                    <TaskItem
                        key={task.id}
                        task={task}
                        onStartEditing={onStartEditing}
                        onCancelEditing={onCancelEditing}
                        onSaveTask={onSaveTask}
                        onRemoveTask={onRemoveTask}
                        onToggleCompletion={onToggleCompletion}
                    />
                );
            })}
        </ul>
    );
}

/**
 * TaskItem Component
 * Represents an individual task with editing, completion toggle, and removal.
 */
function TaskItem({
                      task,
                      onStartEditing,
                      onCancelEditing,
                      onSaveTask,
                      onRemoveTask,
                      onToggleCompletion
                  }) {
    const [editValue, setEditValue] = useState(task.text);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            onSaveTask(task.id, editValue);
        } else if (e.key === 'Escape') {
            onCancelEditing(task.id);
        }
    };

    return (
        <li className="task-item">
            <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleCompletion(task.id)}
                aria-label={task.completed ? "Mark task as incomplete" : "Mark task as completed"}
            />
            {task.isEditing ? (
                <>
                    <input
                        className="task-edit-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                    />
                    <div className="task-actions">
                        <button
                            className="save-btn"
                            onClick={() => onSaveTask(task.id, editValue)}
                        >
                            Save
                        </button>
                        <button className="cancel-btn" onClick={() => onCancelEditing(task.id)}>
                            Cancel
                        </button>
                    </div>
                </>
            ) : (
                <>
          <span className={`task-text ${task.completed ? 'completed' : ''}`}>
            {task.text}
          </span>
                    <div className="task-actions">
                        <button onClick={() => onStartEditing(task.id)}>Edit</button>
                        <button
                            style={{ backgroundColor: '#dc3545', color: '#fff' }}
                            onClick={() => onRemoveTask(task.id)}
                        >
                            X
                        </button>
                    </div>
                </>
            )}
        </li>
    );
}

export default App;
