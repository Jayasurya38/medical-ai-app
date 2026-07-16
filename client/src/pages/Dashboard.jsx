import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { FileText, Upload, PlusCircle, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const fetchReports = async () => {
    try {
      const response = await api.get('/reports/my-reports');
      setReports(response.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
       setError('Only PDF files are supported.');
       return;
    }

    const formData = new FormData();
    formData.append('report', file);
    formData.append('reportType', 'blood_test');

    setUploading(true);
    setError('');

    try {
      await api.post('/reports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchReports();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze report.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-colors duration-200">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Upload and manage your medical test reports</p>
        </div>
        
        <div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="application/pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium transition disabled:opacity-50 shadow-sm"
          >
            {uploading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing with WHO RAG...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload New Report
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg flex items-center gap-3 border border-red-200 dark:border-red-800">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border text-center py-20 rounded-xl shadow-sm border-gray-100 dark:border-gray-700">
          <div className="bg-blue-50 dark:bg-blue-900/40 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={32} className="text-blue-500 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No reports found</h3>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            You haven't uploaded any medical reports yet. Upload a PDF to get started with AI analysis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Link 
              key={report._id} 
              to={`/report/${report._id}`}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md dark:hover:border-gray-600 transition overflow-hidden flex flex-col group"
            >
              <div className="p-5 flex-grow">
                <div className="flex items-start justify-between">
                  <div className="bg-blue-50 dark:bg-gray-700 p-3 rounded-lg text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition">
                    <FileText size={24} />
                  </div>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                    report.status === 'analyzed' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' 
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                  }`}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white break-words line-clamp-2" title={report.fileName}>
                  {report.fileName}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Type: {report.reportType.replace('_', ' ')}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex justify-between group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition">
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                <span className="font-medium text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform inline-block">View Analysis →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
