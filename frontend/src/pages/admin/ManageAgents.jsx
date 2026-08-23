import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../services/api';
import { 
  HiOutlineUserAdd, 
  HiOutlineTrash, 
  HiOutlinePencil, 
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineRefresh,
  HiOutlineSearch,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineCalendar,
  HiOutlineUser,
  HiOutlineLocationMarker
} from 'react-icons/hi';
import styles from './ManageAgents.module.css';

export default function ManageAgents() {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAgent, setEditingAgent] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        address: '',
        shopName: '',
        bio: ''
    });

    // Fetch agents
    const fetchAgents = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/admin/agents');
            
            // Handle different response formats
            let agentsData = [];
            if (res.data) {
                if (Array.isArray(res.data)) {
                    agentsData = res.data;
                } else if (res.data.agents && Array.isArray(res.data.agents)) {
                    agentsData = res.data.agents;
                } else if (res.data.data && Array.isArray(res.data.data)) {
                    agentsData = res.data.data;
                } else {
                    // Try to extract any array from the response
                    for (const key in res.data) {
                        if (Array.isArray(res.data[key])) {
                            agentsData = res.data[key];
                            break;
                        }
                    }
                }
            }
            
            setAgents(agentsData);
        } catch (err) {
            console.error('Error fetching agents:', err);
            setError(err.response?.data?.message || 'Failed to load agents.');
            setAgents([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const validateAgentForm = () => {
        const nextErrors = {};
        const trimmedName = formData.name.trim();
        const trimmedEmail = formData.email.trim();
        const trimmedPhone = formData.phone.trim();
        const trimmedPassword = formData.password.trim();
        const trimmedAddress = formData.address.trim();
        const trimmedShopName = formData.shopName.trim();
        const trimmedBio = formData.bio.trim();

        if (!trimmedName) nextErrors.name = 'Full name is required';
        else if (trimmedName.length < 2) nextErrors.name = 'Name must be at least 2 characters';

        if (!trimmedEmail) nextErrors.email = 'Email address is required';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) nextErrors.email = 'Enter a valid email address';

        if (!trimmedPhone) nextErrors.phone = 'Phone number is required';
        else if (!/^\+?[0-9\s\-()]{7,}$/.test(trimmedPhone)) nextErrors.phone = 'Enter a valid phone number';

        if (!editingAgent && !trimmedPassword) nextErrors.password = 'Password is required for new agents';
        else if (!editingAgent && trimmedPassword.length < 6) nextErrors.password = 'Password must be at least 6 characters';

        if (trimmedAddress && trimmedAddress.length < 5) nextErrors.address = 'Address must be at least 5 characters';
        if (trimmedShopName && trimmedShopName.length < 2) nextErrors.shopName = 'Shop name must be at least 2 characters';
        if (trimmedBio && trimmedBio.length < 10) nextErrors.bio = 'Bio must be at least 10 characters';

        setFormErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
    };

    // Handle add/update agent
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateAgentForm()) return;

        setSubmitting(true);
        setError(null);

        try {
            if (editingAgent) {
                // Update agent - remove password if empty
                const updateData = { ...formData };
                if (!updateData.password) {
                    delete updateData.password;
                }
                await api.put(`/admin/agents/${editingAgent.id}`, updateData);
            } else {
                // Create new agent
                await api.post('/admin/agents', formData);
            }
            
            // Reset form and refresh list
            setFormData({ name: '', phone: '', email: '', password: '', address: '', shopName: '', bio: '' });
            setShowAddModal(false);
            setEditingAgent(null);
            await fetchAgents();
        } catch (err) {
            console.error('Error saving agent:', err);
            setError(err.response?.data?.message || 'Failed to save agent');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete agent
    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to deactivate this agent?')) return;
        try {
            await api.delete(`/admin/agents/${id}`);
            await fetchAgents();
        } catch (err) {
            console.error('Error deleting agent:', err);
            setError(err.response?.data?.message || 'Failed to delete agent');
        }
    };

    // Handle edit agent
    const handleEdit = (agent) => {
        setEditingAgent(agent);
        setFormData({
            name: agent.name || '',
            phone: agent.phone || '',
            email: agent.email || '',
            password: '',
            address: agent.address || '',
            shopName: agent.shopName || '',
            bio: agent.bio || ''
        });
        setFormErrors({});
        setShowAddModal(true);
    };

    // Handle status toggle
    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await api.put(`/admin/agents/${id}/status`, { status: newStatus });
            await fetchAgents();
        } catch (err) {
            console.error('Error updating agent status:', err);
            setError(err.response?.data?.message || 'Failed to update agent status');
        }
    };

    // Filter agents
    const filteredAgents = agents.filter(agent => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            agent.name?.toLowerCase().includes(search) ||
            agent.email?.toLowerCase().includes(search) ||
            agent.phone?.toLowerCase().includes(search) ||
            agent.address?.toLowerCase().includes(search)
        );
    });

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <AdminLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 className={styles.title}>Manage Agents</h1>
                        <p className={styles.subtitle}>
                            {agents.length} {agents.length === 1 ? 'agent' : 'agents'} total
                        </p>
                    </div>
                    <div className={styles.headerRight}>
                        <button 
                            className={styles.refreshBtn}
                            onClick={fetchAgents}
                            disabled={loading}
                        >
                            <HiOutlineRefresh className={loading ? styles.spinning : ''} />
                            Refresh
                        </button>
                        <button 
                            className={styles.addBtn}
                            onClick={() => {
                                setEditingAgent(null);
                                setFormData({ name: '', phone: '', email: '', password: '', address: '', shopName: '', bio: '' });
                                setShowAddModal(true);
                            }}
                        >
                            <HiOutlineUserAdd /> Add Agent
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className={styles.errorBanner}>
                        <span><HiOutlineXCircle aria-hidden="true" /> {error}</span>
                        <button onClick={() => setError(null)} className={styles.closeError}>×</button>
                    </div>
                )}

                {/* Search */}
                <div className={styles.searchWrapper}>
                    <HiOutlineSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="Search agents by name, email, or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Table */}
                {loading ? (
                    <div className={styles.loading}>
                        <span className={styles.spinner} />
                        Loading agents...
                    </div>
                ) : filteredAgents.length === 0 ? (
                    <div className={styles.empty}>
                        <HiOutlineUser size={48} className={styles.emptyIcon} />
                        <p>No agents found</p>
                        <span>{searchTerm ? 'Try adjusting your search' : 'Click "Add Agent" to create your first agent'}</span>
                    </div>
                ) : (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.map((agent) => (
                                    <tr key={agent.id}>
                                        <td>
                                            <div className={styles.agentName}>
                                                <div className={styles.avatar}>
                                                    {agent.name?.charAt(0) || 'A'}
                                                </div>
                                                <div>
                                                    <div className={styles.name}>{agent.name || 'N/A'}</div>
                                                    {agent.shopName && (
                                                        <div className={styles.shopName}>{agent.shopName}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.email}>
                                                <HiOutlineMail size={14} />
                                                <span>{agent.email || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.phone}>
                                                <HiOutlinePhone size={14} />
                                                <span>{agent.phone || 'N/A'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${
                                                agent.status === 'active' ? styles.statusActive : 
                                                agent.status === 'inactive' ? styles.statusInactive : 
                                                styles.statusSuspended
                                            }`}>
                                                {agent.status || 'unknown'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className={styles.date}>
                                                <HiOutlineCalendar size={14} />
                                                <span>{formatDate(agent.created_at)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button
                                                    className={styles.toggleBtn}
                                                    onClick={() => handleToggleStatus(agent.id, agent.status)}
                                                    title={agent.status === 'active' ? 'Deactivate' : 'Activate'}
                                                >
                                                    {agent.status === 'active' ? (
                                                        <HiOutlineXCircle size={18} color="#ef4444" />
                                                    ) : (
                                                        <HiOutlineCheckCircle size={18} color="#22c55e" />
                                                    )}
                                                </button>
                                                <button
                                                    className={styles.editBtn}
                                                    onClick={() => handleEdit(agent)}
                                                    title="Edit"
                                                >
                                                    <HiOutlinePencil size={18} />
                                                </button>
                                                <button
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDelete(agent.id)}
                                                    title="Delete"
                                                >
                                                    <HiOutlineTrash size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Add/Edit Modal */}
                {showAddModal && (
                    <div className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                            <div className={styles.modalHeader}>
                                <h2>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</h2>
                                <button className={styles.closeBtn} onClick={() => setShowAddModal(false)}>×</button>
                            </div>
                            <form onSubmit={handleSubmit} className={styles.modalForm}>
                                {error && (
                                    <div className={styles.modalError}>
                                        {error}
                                    </div>
                                )}
                                <div className={styles.formGroup}>
                                    <label>Full Name *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter agent name"
                                        disabled={submitting}
                                        className={formErrors.name ? styles.inputError : ''}
                                    />
                                    {formErrors.name && <small className={styles.helperTextError}>{formErrors.name}</small>}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Email Address *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter agent email"
                                        disabled={!!editingAgent || submitting}
                                        className={formErrors.email ? styles.inputError : ''}
                                    />
                                    {formErrors.email && <small className={styles.helperTextError}>{formErrors.email}</small>}
                                    {editingAgent && (
                                        <small className={styles.helperText}>Email cannot be changed</small>
                                    )}
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Phone Number *</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        required
                                        placeholder="Enter phone number"
                                        disabled={submitting}
                                        className={formErrors.phone ? styles.inputError : ''}
                                    />
                                    {formErrors.phone && <small className={styles.helperTextError}>{formErrors.phone}</small>}
                                </div>
                                {!editingAgent && (
                                    <div className={styles.formGroup}>
                                        <label>Password *</label>
                                        <input
                                            type="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required={!editingAgent}
                                            placeholder="Enter password (min 6 characters)"
                                            disabled={submitting}
                                            minLength={6}
                                            className={formErrors.password ? styles.inputError : ''}
                                        />
                                        {formErrors.password && <small className={styles.helperTextError}>{formErrors.password}</small>}
                                        <small className={styles.helperText}>Minimum 6 characters</small>
                                    </div>
                                )}
                                <div className={styles.formRow}>
                                    <div className={styles.formGroup}>
                                        <label>Shop Name</label>
                                        <input
                                            type="text"
                                            name="shopName"
                                            value={formData.shopName}
                                            onChange={handleInputChange}
                                            placeholder="Enter shop name"
                                            disabled={submitting}
                                            className={formErrors.shopName ? styles.inputError : ''}
                                        />
                                        {formErrors.shopName && <small className={styles.helperTextError}>{formErrors.shopName}</small>}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Address</label>
                                        <input
                                            type="text"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            placeholder="Enter address"
                                            disabled={submitting}
                                            className={formErrors.address ? styles.inputError : ''}
                                        />
                                        {formErrors.address && <small className={styles.helperTextError}>{formErrors.address}</small>}
                                    </div>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Bio</label>
                                    <textarea
                                        name="bio"
                                        value={formData.bio}
                                        onChange={handleInputChange}
                                        placeholder="Enter agent bio"
                                        rows="3"
                                        disabled={submitting}
                                        className={formErrors.bio ? styles.inputError : ''}
                                    />
                                    {formErrors.bio && <small className={styles.helperTextError}>{formErrors.bio}</small>}
                                </div>
                                <div className={styles.modalActions}>
                                    <button 
                                        type="button" 
                                        className={styles.cancelBtn} 
                                        onClick={() => setShowAddModal(false)}
                                        disabled={submitting}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit" 
                                        className={styles.saveBtn} 
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}