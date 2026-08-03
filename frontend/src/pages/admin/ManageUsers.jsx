import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import {
  HiOutlineUser,
  HiOutlineSearch,
  HiOutlineBan,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlineX,
} from 'react-icons/hi';
import styles from './ManageUsers.module.css';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Fetch users from real endpoint ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
      setFilteredUsers(res.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresh every 30 seconds ──
  useEffect(() => {
    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [fetchUsers]);

  // ── Search filter ──
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    const lower = searchTerm.toLowerCase();
    const filtered = users.filter(
      (u) =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower) ||
        u.role.toLowerCase().includes(lower)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  // ── Update user status ──
  const updateUserStatus = async (userId, newStatus) => {
    const action = newStatus === 'active' ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    setActionLoading(userId);
    try {
      await api.put('/admin/users/status', { userId, status: newStatus });
      // Optimistic update
      const updatedUsers = users.map((u) =>
        u.id === userId ? { ...u, status: newStatus } : u
      );
      setUsers(updatedUsers);
      setFilteredUsers(
        filteredUsers.map((u) =>
          u.id === userId ? { ...u, status: newStatus } : u
        )
      );
    } catch (err) {
      console.error('Status update error:', err);
      alert(err.response?.data?.message || 'Failed to update user status.');
      // Revert optimistic update by refreshing
      fetchUsers();
    } finally {
      setActionLoading(null);
    }
  };

  const clearSearch = () => setSearchTerm('');

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Manage Users</h1>
            <p className={styles.subtitle}>
              View and manage all platform users
              {lastUpdated && (
                <span className={styles.lastUpdated}>
                  {' '}
                  · Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={fetchUsers}
            disabled={loading}
          >
            <HiOutlineRefresh /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </header>

        <div className={styles.searchBar}>
          <HiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clearBtn} onClick={clearSearch}>
              <HiOutlineX />
            </button>
          )}
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.tableWrapper}>
          {loading && filteredUsers.length === 0 ? (
            <div className={styles.loadingState}>
              <span className={styles.spinner} />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className={styles.emptyState}>
              {searchTerm ? 'No users match your search.' : 'No users found.'}
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className={styles.userName}>
                        <HiOutlineUser className={styles.userIcon} />
                        {user.name}
                      </span>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[user.status]}`}>
                        {user.status || 'pending'}
                      </span>
                    </td>
                    <td>{user.joined ? new Date(user.joined).toLocaleDateString() : '—'}</td>
                    <td>
                      {user.status === 'active' ? (
                        <button
                          className={styles.suspendBtn}
                          onClick={() => updateUserStatus(user.id, 'suspended')}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <>
                              <HiOutlineBan /> Suspend
                            </>
                          )}
                        </button>
                      ) : user.status === 'suspended' ? (
                        <button
                          className={styles.activateBtn}
                          onClick={() => updateUserStatus(user.id, 'active')}
                          disabled={actionLoading === user.id}
                        >
                          {actionLoading === user.id ? (
                            <span className={styles.spinnerSmall} />
                          ) : (
                            <>
                              <HiOutlineCheck /> Activate
                            </>
                          )}
                        </button>
                      ) : (
                        <span className={styles.pendingLabel}>Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}