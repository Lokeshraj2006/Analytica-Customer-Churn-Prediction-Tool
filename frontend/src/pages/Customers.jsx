import { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { HiOutlineSearch, HiOutlineDownload, HiOutlineEye } from 'react-icons/hi';

export default function Customers() {
  const { format } = useCurrency();
  const { canExport, isViewer } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [contractFilter, setContractFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  useEffect(() => {
    fetchCustomers();
  }, [page, contractFilter, riskFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        per_page: 15,
        ...(search && { search }),
        ...(contractFilter !== 'all' && { contract_filter: contractFilter }),
        ...(riskFilter !== 'all' && { risk_filter: riskFilter }),
      };
      const response = await customerAPI.getCustomers(params);
      setCustomers(response.data.customers || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const exportCSV = () => {
    if (customers.length === 0) return;
    const headers = Object.keys(customers[0]).join(',');
    const rows = customers.map(c => Object.values(c).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container">
      <div className="page-header animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1>Customer Data</h1>
            <p>Browse and analyze customer records from the churn dataset</p>
          </div>
          {isViewer && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '4px 12px', borderRadius: 'var(--radius-full)',
              background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)',
              color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600,
            }}>
              <HiOutlineEye /> Read-only view
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="customers-toolbar animate-fade-in-up">
        <form className="search-input-wrapper" onSubmit={handleSearch}>
          <span className="search-icon"><HiOutlineSearch /></span>
          <input
            type="text"
            className="form-input"
            placeholder="Search by customer ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>

        <select
          className="filter-select"
          value={contractFilter}
          onChange={(e) => { setContractFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Contracts</option>
          <option value="Month-to-month">Month-to-month</option>
          <option value="One year">One year</option>
          <option value="Two year">Two year</option>
        </select>

        <select
          className="filter-select"
          value={riskFilter}
          onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All Risk Levels</option>
          <option value="High">High Risk (Churned)</option>
          <option value="Low">Low Risk (Active)</option>
        </select>

        {canExport && (
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <HiOutlineDownload /> Export CSV
          </button>
        )}
      </div>

      {/* Results count */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
        Showing {customers.length} of {total} customers
      </p>

      {/* Table */}
      <div className="glass-card animate-fade-in-up" style={{ padding: 0, overflow: 'auto' }}>
        {loading ? (
          <div className="loading-container" style={{ minHeight: 300 }}>
            <div className="spinner" />
            <p className="loading-text">Loading customers...</p>
          </div>
        ) : customers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Gender</th>
                <th>Tenure</th>
                <th>Contract</th>
                <th>Internet</th>
                <th>Monthly</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, i) => (
                <tr key={customer.id} style={{ animationDelay: `${i * 30}ms` }}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--accent-blue)' }}>
                    {customer.id}
                  </td>
                  <td>{customer.gender}</td>
                  <td>{customer.tenure} mo</td>
                  <td>
                    <span className="badge badge-info">{customer.contract}</span>
                  </td>
                  <td>{customer.internetService}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{format(customer.monthlyCharges)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{format(customer.totalCharges)}</td>
                  <td>
                    <span className={`badge ${customer.churn === 1 ? 'badge-danger' : 'badge-success'}`}>
                      <span className={`status-dot ${customer.churn === 1 ? 'high' : 'low'}`} style={{ width: 6, height: 6 }} />
                      {customer.churn === 1 ? 'Churned' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No customers found</h3>
            <p>Try adjusting your filters or search query</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-btn"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            ‹
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let pageNum;
            if (totalPages <= 7) {
              pageNum = i + 1;
            } else if (page <= 4) {
              pageNum = i + 1;
            } else if (page >= totalPages - 3) {
              pageNum = totalPages - 6 + i;
            } else {
              pageNum = page - 3 + i;
            }
            return (
              <button
                key={pageNum}
                className={`pagination-btn ${page === pageNum ? 'active' : ''}`}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            className="pagination-btn"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
