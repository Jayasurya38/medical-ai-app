import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, CheckCircle, Info, FileText } from 'lucide-react';
import ChatPanel from '../components/ChatPanel';

const ReportDetail = () => {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await api.get(`/reports/${id}`);
        setReport(response.data);
      } catch (err) {
        setError('Failed to load report details.');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-20 dark:text-gray-300">Loading report...</div>;
  }

  if (error || !report) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg">{error || 'Report not found'}</div>
        <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-400">← Back to Dashboard</Link>
      </div>
    );
  }

  let analysis = null;
  if (report.analysis) {
    try {
      analysis = JSON.parse(report.analysis);
    } catch(e) {
      console.error("Failed to parse analysis");
    }
  }

  const whoGuidance = report.guidanceResult || analysis?.whoGuidance || '';
  const whoEvidence = report.guidanceEvidence?.length ? report.guidanceEvidence : (analysis?.whoEvidence || []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 transition-colors duration-200">
      <Link to="/" className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 transition">
        <ArrowLeft size={16} className="mr-1" /> Back to Dashboard
      </Link>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden mb-8 relative transition-colors duration-200">
        <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 px-6 py-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div className="flex items-center gap-3">
             <div className="bg-white dark:bg-gray-900 p-2 border border-gray-200 dark:border-gray-700 rounded-lg text-blue-600 dark:text-blue-400 shadow-sm">
               <FileText size={24} />
             </div>
             <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white break-words" title={report.fileName}>
                  {report.fileName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Uploaded on {new Date(report.createdAt).toLocaleDateString()}</p>
             </div>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${
            report.status === 'analyzed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800' 
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
          }`}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
        </div>
        
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <div className="flex flex-col">
            {!analysis ? (
               <div className="text-center py-10 text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                  <Info className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={32} />
                  <p>AI Analysis is pending or not available for this report.</p>
               </div>
            ) : (
            <div className="space-y-8">
              {/* Summary Section */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                   <div className="h-6 w-1 bg-blue-600 dark:bg-blue-500 rounded-full" />
                   <h2 className="text-xl font-bold text-gray-900 dark:text-white">Executive Summary</h2>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-5 rounded-lg text-blue-900 dark:text-blue-200 leading-relaxed shadow-sm">
                  {analysis.summary}
                </div>
              </section>

              {/* Health Status */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                   <div className="h-6 w-1 bg-green-500 rounded-full" />
                   <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overall Health Indication</h2>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">{analysis.overallHealth}</span>
                </div>
              </section>

              {/* Abnormal Values Table */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                   <div className="h-6 w-1 bg-red-500 rounded-full" />
                   <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notable / Abnormal Values</h2>
                </div>
                
                {report.abnormalValues && report.abnormalValues.length > 0 ? (
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800/80">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Test Name</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient Value</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Normal Range</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {report.abnormalValues.map((val, idx) => (
                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/30'} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{val.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 font-semibold">{val.value}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{val.normalRange}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-md border ${
                                val.status?.toUpperCase() === 'HIGH' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                                val.status?.toUpperCase() === 'LOW' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50' :
                                'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50'
                              }`}>
                                {val.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-800/50 shadow-sm">
                    <CheckCircle size={20} />
                    <span className="font-medium">No notable abnormal values found in this report.</span>
                  </div>
                )}
              </section>

              {/* WHO Guideline Check */}
              {whoGuidance && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-1 bg-amber-500 rounded-full" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">WHO Guideline Check</h2>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-5 rounded-lg text-amber-900 dark:text-amber-200 leading-relaxed shadow-sm">
                    <p className="whitespace-pre-wrap">{whoGuidance}</p>
                  </div>
                  {whoEvidence.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {whoEvidence.slice(0, 3).map((item, idx) => (
                        <li key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {/* Doctor Questions */}
              {analysis.doctorQuestions && analysis.doctorQuestions.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-1 bg-purple-500 rounded-full" />
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Questions for your Doctor</h2>
                  </div>
                  <ul className="space-y-3">
                    {analysis.doctorQuestions.map((q, idx) => (
                      <li key={idx} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-sm flex items-start gap-4 transition-transform hover:-translate-y-1">
                        <span className="bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-sm font-bold h-7 w-7 rounded-full inline-flex items-center justify-center flex-shrink-0 mt-0.5 border border-purple-200 dark:border-purple-800">
                          {idx + 1}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium pt-0.5">{q}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
          </div>

          {/* Interactive Chat Panel */}
          <div className="flex flex-col">
             <ChatPanel reportId={report._id} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetail;
