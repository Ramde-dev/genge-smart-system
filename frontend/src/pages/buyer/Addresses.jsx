import { useEffect, useState } from 'react';
import BuyerLayout from './BuyerLayout';
import api from '../../services/api';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineHome, HiOutlineOfficeBuilding, HiOutlineCheck } from 'react-icons/hi';
import styles from './Addresses.module.css';

export default function Addresses() {
  const [errors, setErrors] = useState({});

  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestError, setRequestError] = useState('');

  useEffect(() => {
    api.get('/buyer/addresses')
      .then(({ data }) => setAddresses(data))
      .catch(() => setRequestError('Failed to load addresses.'))
      .finally(() => setLoading(false));
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    postalCode: '',
    isDefault: false,
  });

  // ── Handlers ──
  const handleAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      fullName: '',
      phone: '',
      address: '',
      city: '',
      region: '',
      postalCode: '',
      isDefault: false,
    });
    setShowForm(true);
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setFormData(address);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.delete(`/buyer/addresses/${id}`);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch {
      setRequestError('Failed to delete address.');
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/buyer/addresses/${id}/default`);
      setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
    } catch {
      setRequestError('Failed to update default address.');
    }
  };

  const validateAddress = () => {
    const nextErrors = {};
    const trimmedName = formData.name.trim();
    const trimmedFullName = formData.fullName.trim();
    const trimmedPhone = formData.phone.trim();
    const trimmedAddress = formData.address.trim();
    const trimmedCity = formData.city.trim();
    const trimmedRegion = formData.region.trim();
    const trimmedPostal = formData.postalCode.trim();

    if (!trimmedName) nextErrors.name = 'Address label is required';
    else if (trimmedName.length < 2) nextErrors.name = 'Address label must be at least 2 characters';

    if (!trimmedFullName) nextErrors.fullName = 'Full name is required';
    else if (trimmedFullName.length < 2) nextErrors.fullName = 'Full name must be at least 2 characters';

    if (!trimmedPhone) nextErrors.phone = 'Phone number is required';
    else if (!/^\+?[0-9\s()-]{7,}$/.test(trimmedPhone)) nextErrors.phone = 'Enter a valid phone number';

    if (!trimmedAddress) nextErrors.address = 'Address line is required';
    else if (trimmedAddress.length < 5) nextErrors.address = 'Address line must be at least 5 characters';

    if (!trimmedCity) nextErrors.city = 'City is required';
    else if (trimmedCity.length < 2) nextErrors.city = 'City must be at least 2 characters';

    if (!trimmedRegion) nextErrors.region = 'Region is required';
    else if (trimmedRegion.length < 2) nextErrors.region = 'Region must be at least 2 characters';

    if (trimmedPostal && !/^[A-Za-z0-9-]{4,10}$/.test(trimmedPostal)) {
      nextErrors.postalCode = 'Postal code must be 4-10 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;
    try {
      const response = editingId
        ? await api.put(`/buyer/addresses/${editingId}`, formData)
        : await api.post('/buyer/addresses', formData);
      const savedAddress = response.data;
      setAddresses(current => {
        const next = editingId
          ? current.map(address => address.id === editingId ? savedAddress : address)
          : [...current, savedAddress];
        return savedAddress.isDefault
          ? next.map(address => ({ ...address, isDefault: address.id === savedAddress.id }))
          : next;
      });
      setShowForm(false);
      setEditingId(null);
      setErrors({});
      setRequestError('');
    } catch (error) {
      setRequestError(error.response?.data?.message || 'Failed to save address.');
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  };

  const getDefaultAddress = () => addresses.find(a => a.isDefault);
  const otherAddresses = addresses.filter(a => !a.isDefault);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  return (
    <BuyerLayout>
      <div className={styles.container}>
        {requestError && <div className={styles.errorText}>{requestError}</div>}
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>My Addresses</h1>
          </div>
          <button className={styles.addBtn} onClick={handleAdd}>
            <HiOutlinePlus /> Add Address
          </button>
        </header>

        {/* Default Address */}
        {!loading && getDefaultAddress() && (
          <div className={styles.defaultSection}>
            <h3 className={styles.sectionTitle}>Default Address</h3>
            <AddressCard
              address={getDefaultAddress()}
              isDefault
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          </div>
        )}

        {/* Other Addresses */}
        {!loading && otherAddresses.length > 0 && (
          <div className={styles.otherSection}>
            <h3 className={styles.sectionTitle}>Other Addresses</h3>
            <div className={styles.addressGrid}>
              {otherAddresses.map((address) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  isDefault={false}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && addresses.length === 0 && (
          <div className={styles.emptyState}>
            <HiOutlineHome size={48} className={styles.emptyIcon} />
            <p>No addresses saved yet</p>
            <span>Add your first address for faster checkout</span>
          </div>
        )}

        {/* Add/Edit Form Modal */}
        {showForm && (
          <div className={styles.modalOverlay} onClick={handleCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <h2 className={styles.modalTitle}>
                {editingId ? 'Edit Address' : 'Add New Address'}
              </h2>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGrid}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Address Label</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                      placeholder="Home, Office, etc."
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      required
                    />
                    {errors.name && <p className={styles.errorText}>{errors.name}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.fullName ? styles.inputError : ''}`}
                      placeholder="Recipient name"
                      value={formData.fullName}
                      onChange={(e) => updateField('fullName', e.target.value)}
                      required
                    />
                    {errors.fullName && <p className={styles.errorText}>{errors.fullName}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input
                      type="tel"
                      className={`${styles.input} ${errors.phone ? styles.inputError : ''}`}
                      placeholder="+255 700 000 000"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      required
                    />
                    {errors.phone && <p className={styles.errorText}>{errors.phone}</p>}
                  </div>
                  <div className={styles.inputGroupFull}>
                    <label className={styles.label}>Address Line</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.address ? styles.inputError : ''}`}
                      placeholder="Street, building, apartment"
                      value={formData.address}
                      onChange={(e) => updateField('address', e.target.value)}
                      required
                    />
                    {errors.address && <p className={styles.errorText}>{errors.address}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>City</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.city ? styles.inputError : ''}`}
                      placeholder="e.g. Dar es Salaam"
                      value={formData.city}
                      onChange={(e) => updateField('city', e.target.value)}
                      required
                    />
                    {errors.city && <p className={styles.errorText}>{errors.city}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Region</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.region ? styles.inputError : ''}`}
                      placeholder="e.g. Kinondoni"
                      value={formData.region}
                      onChange={(e) => updateField('region', e.target.value)}
                      required
                    />
                    {errors.region && <p className={styles.errorText}>{errors.region}</p>}
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Postal Code</label>
                    <input
                      type="text"
                      className={`${styles.input} ${errors.postalCode ? styles.inputError : ''}`}
                      placeholder="e.g. 14111"
                      value={formData.postalCode}
                      onChange={(e) => updateField('postalCode', e.target.value)}
                    />
                    {errors.postalCode && <p className={styles.errorText}>{errors.postalCode}</p>}
                  </div>
                  <div className={styles.inputGroup} style={{ justifyContent: 'center' }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.isDefault}
                        onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      />
                      Set as default
                    </label>
                  </div>
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    {editingId ? 'Update Address' : 'Save Address'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </BuyerLayout>
  );
}

// ── Address Card Component ──
function AddressCard({ address, isDefault, onEdit, onDelete, onSetDefault }) {
  return (
    <div className={`${styles.addressCard} ${isDefault ? styles.defaultCard : ''}`}>
      {isDefault && (
        <span className={styles.defaultBadge}>
          <HiOutlineCheck /> Default
        </span>
      )}
      <div className={styles.addressInfo}>
        <div className={styles.addressHeader}>
          <span className={styles.addressName}>
            {address.icon === 'office' ? <HiOutlineOfficeBuilding /> : <HiOutlineHome />}
            {address.name}
          </span>
          <div className={styles.actions}>
            <button className={styles.editBtn} onClick={() => onEdit(address)}>
              <HiOutlinePencil />
            </button>
            <button className={styles.deleteBtn} onClick={() => onDelete(address.id)}>
              <HiOutlineTrash />
            </button>
          </div>
        </div>
        <p className={styles.addressDetail}>{address.fullName}</p>
        <p className={styles.addressDetail}>{address.phone}</p>
        <p className={styles.addressDetail}>{address.address}</p>
        <p className={styles.addressDetail}>{address.city}, {address.region}</p>
        {address.postalCode && (
          <p className={styles.addressDetail}>Postal: {address.postalCode}</p>
        )}
      </div>
      {!isDefault && (
        <button className={styles.setDefaultBtn} onClick={() => onSetDefault(address.id)}>
          Set as Default
        </button>
      )}
    </div>
  );
}