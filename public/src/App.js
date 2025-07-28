import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Clock, AlertCircle, Calendar, Sun, Sunset, RefreshCw } from 'lucide-react';

export default function BaserowTodoApp() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  // Form states
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('medium');
  const [newCategory, setNewCategory] = useState('General');
  const [newBlock, setNewBlock] = useState('afternoon');
  const [newDueDate, setNewDueDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  
  // Filter states
  const [filter, setFilter] = useState('all');
  const [blockFilter, setBlockFilter] = useState('all');

  // Baserow configuration
  const BASEROW_URL = 'https://api.baserow.io';
  const API_TOKEN = 'ECM9tBDq2vAobggeJQhzOtSAuSf8u5Ga';
  const TABLE_ID = '623600';

  const baserowHeaders = {
    'Authorization': `Token ${API_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Load tasks from Baserow
  const loadTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/`, {
        headers: baserowHeaders,
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      setTasks(data.results || []);
      setError(null);
    } catch (err) {
      if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
        setError('Connection blocked by browser security. This app needs to run from a web server or you can use the Baserow web interface directly.');
      } else {
        setError(`Error loading tasks: ${err.message}`);
      }
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new task to Baserow
  const addTask = async () => {
    if (!newTask.trim()) return;
    
    try {
      setSyncing(true);
      const taskData = {
        task_name: newTask.trim(),
        status: 'todo',
        priority: newPriority,
        category: newCategory,
        admin_block: newBlock,
        due_date: newDueDate || null,
        notes: newNotes || null,
      };

      const response = await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/`, {
        method: 'POST',
        headers: baserowHeaders,
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error(`Failed to add task: ${response.statusText}`);
      }

      const newTaskFromServer = await response.json();
      setTasks([newTaskFromServer, ...tasks]);
      
      // Reset form
      setNewTask('');
      setNewPriority('medium');
      setNewCategory('General');
      setNewBlock('afternoon');
      setNewDueDate('');
      setNewNotes('');
      
    } catch (err) {
      setError(`Error adding task: ${err.message}`);
      console.error('Add error:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Update task status
  const toggleTask = async (taskId, currentStatus) => {
    try {
      setSyncing(true);
      const newStatus = currentStatus === 'completed' ? 'todo' : 'completed';
      
      const response = await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/${taskId}/`, {
        method: 'PATCH',
        headers: baserowHeaders,
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }

      const updatedTask = await response.json();
      setTasks(tasks.map(task => 
        task.id === taskId ? updatedTask : task
      ));
      
    } catch (err) {
      setError(`Error updating task: ${err.message}`);
      console.error('Update error:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      setSyncing(true);
      const response = await fetch(`${BASEROW_URL}/api/database/rows/table/${TABLE_ID}/${taskId}/`, {
        method: 'DELETE',
        headers: baserowHeaders,
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }

      setTasks(tasks.filter(task => task.id !== taskId));
      
    } catch (err) {
      setError(`Error deleting task: ${err.message}`);
      console.error('Delete error:', err);
    } finally {
      setSyncing(false);
    }
  };

  // Load tasks on component mount
  useEffect(() => {
    loadTasks();
  }, []);

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const statusFilter = filter === 'all' || 
                        (filter === 'active' && task.status !== 'completed') ||
                        (filter === 'completed' && task.status === 'completed');
    
    const blockFilterMatch = blockFilter === 'all' || task.admin_block === blockFilter;
    
    return statusFilter && blockFilterMatch;
  });

  // Calculate stats
  const completedCount = tasks.filter(task => task.status === 'completed').length;
  const totalCount = tasks.length;
  const morningTasks = tasks.filter(task => task.admin_block === 'morning').length;
  const afternoonTasks = tasks.filter(task => task.admin_block === 'afternoon').length;

  // Priority styling
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'low': return <Clock className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const getBlockIcon = (block) => {
    return block === 'morning' ? 
      <Sun className="w-4 h-4 text-orange-500" /> : 
      <Sunset className="w-4 h-4 text-blue-500" />;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-white">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading tasks from Baserow...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-800">Work Todo List</h1>
          <button
            onClick={loadTasks}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700">Total Tasks</div>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="font-medium text-gray-700">Completed</div>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg flex items-center gap-2">
            <div>
              <div className="font-medium text-gray-700 flex items-center gap-1">
                <Sun className="w-4 h-4" /> Morning (9-11am)
              </div>
              <div className="text-2xl font-bold text-orange-600">{morningTasks}</div>
            </div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg flex items-center gap-2">
            <div>
              <div className="font-medium text-gray-700 flex items-center gap-1">
                <Sunset className="w-4 h-4" /> Afternoon (2-5pm)
              </div>
              <div className="text-2xl font-bold text-blue-600">{afternoonTasks}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Add new task */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a new task..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addTask}
            disabled={syncing || !newTask.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g., Meetings, Reports"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Block</label>
            <select
              value={newBlock}
              onChange={(e) => setNewBlock(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="morning">Morning (9-11am)</option>
              <option value="afternoon">Afternoon (2-5pm)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Additional details..."
            rows="2"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'active' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Completed
          </button>
        </div>

        <div className="border-l border-gray-300 pl-4 flex gap-2">
          <button
            onClick={() => setBlockFilter('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              blockFilter === 'all' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Blocks
          </button>
          <button
            onClick={() => setBlockFilter('morning')}
            className={`px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1 ${
              blockFilter === 'morning' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Sun className="w-3 h-3" /> Morning
          </button>
          <button
            onClick={() => setBlockFilter('afternoon')}
            className={`px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1 ${
              blockFilter === 'afternoon' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Sunset className="w-3 h-3" /> Afternoon
          </button>
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {filter === 'completed' ? 'No completed tasks yet' : 
             filter === 'active' ? 'No active tasks' : 'No tasks yet'}
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              className={`p-4 border-l-4 rounded-lg transition-all ${getPriorityColor(task.priority)} ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => toggleTask(task.id, task.status)}
                    disabled={syncing}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors disabled:opacity-50 ${
                      task.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {task.status === 'completed' && <Check className="w-3 h-3" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                      {task.task_name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {task.category}
                      </span>
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                        <span className="text-xs text-gray-600 capitalize">
                          {task.priority}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getBlockIcon(task.admin_block)}
                        <span className="text-xs text-gray-600 capitalize">
                          {task.admin_block === 'morning' ? '9-11am' : '2-5pm'}
                        </span>
                      </div>
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                    {task.notes && (
                      <div className="text-sm text-gray-600 mt-2 italic">
                        {task.notes}
                      </div>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => deleteTask(task.id)}
                  disabled={syncing}
                  className="text-gray-400 hover:text-red-600 transition-colors ml-4 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Daily Progress</span>
            <span className="text-sm text-gray-600">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Syncing with Baserow...
        </div>
      )}
    </div>
  );
}
