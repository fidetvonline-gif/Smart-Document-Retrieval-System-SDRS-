/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Upload,
  BarChart2,
  Users,
  ShieldAlert,
  Settings,
  Folder,
  Download,
  Eye,
  Plus,
  LogOut,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCheck,
  Lock,
  Unlock,
  Trash2,
  Edit3,
  UserCheck,
  Activity,
  Sparkles,
  RefreshCw,
  HardDrive,
  Clock,
  ChevronRight,
  Filter,
  Check,
  X,
  Menu,
} from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  role: "Administrator" | "Editor" | "Viewer";
  department: string;
  status: "Active" | "Inactive";
  created_at: string;
  last_login: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface Department {
  id: string;
  name: string;
  description: string;
}

interface DocumentItem {
  id: string;
  title: string;
  description: string;
  original_filename: string;
  file_type: string;
  mime_type: string;
  file_size: number;
  category_id: string;
  department_id: string;
  uploaded_by: string;
  author: string;
  access_level: "Public" | "Department Only" | "Restricted" | "Confidential";
  status: "Active" | "Archived" | "Deleted";
  extracted_text?: string;
  ocr_text?: string;
  tags: string[];
  page_count: number;
  created_at: string;
  updated_at: string;
  downloads_count: number;
  views_count: number;
  matchScore?: number;
}

interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  document_id?: string;
  document_title?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  result: "Success" | "Failed";
}

interface ReportsData {
  totalDocs: number;
  totalUsers: number;
  totalStorageMB: string;
  totalDownloads: number;
  totalViews: number;
  byCategory: { categoryName: string; count: number }[];
  byDepartment: { departmentName: string; count: number }[];
  monthlyUploads: { month: string; count: number }[];
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<
    "dashboard" | "documents" | "upload" | "search" | "categories" | "users" | "audit-logs" | "reports" | "detail"
  >("dashboard");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<ReportsData | null>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<DocumentItem[]>([]);
  const [searchCategory, setSearchCategory] = useState<string>("");
  const [searchDepartment, setSearchDepartment] = useState<string>("");
  const [searchFileType, setSearchFileType] = useState<string>("");

  // Upload form state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState("");
  const [uploadDept, setUploadDept] = useState("");
  const [uploadAccess, setUploadAccess] = useState<DocumentItem["access_level"]>("Department Only");
  const [uploadAuthor, setUploadAuthor] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [useOcr, setUseOcr] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchSession();
    fetchMetadata();
  }, []);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error("Session error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [docsRes, catRes, deptRes, repRes, usersRes] = await Promise.all([
        fetch("/api/documents"),
        fetch("/api/categories"),
        fetch("/api/departments"),
        fetch("/api/reports"),
        fetch("/api/users"),
      ]);

      const docs = await docsRes.json();
      const cats = await catRes.json();
      const depts = await deptRes.json();
      const reps = await repRes.json();
      const usrs = await usersRes.json();

      setDocuments(docs);
      setCategories(cats);
      setDepartments(depts);
      setReports(reps);
      setUsersList(usrs);

      if (cats.length > 0 && !uploadCategory) setUploadCategory(cats[0].id);
      if (depts.length > 0 && !uploadDept) setUploadDept(depts[0].id);
    } catch (err) {
      console.error("Error loading metadata:", err);
    }
  };

  const switchRole = async (role: "Administrator" | "Editor" | "Viewer") => {
    try {
      const res = await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        showToast(`Switched role to ${role}`);
        fetchMetadata();
      }
    } catch (err) {
      console.error("Switch role error:", err);
    }
  };

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      if (searchCategory) params.append("category", searchCategory);
      if (searchDepartment) params.append("department", searchDepartment);
      if (searchFileType) params.append("fileType", searchFileType);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setSearchResults(data);
      setCurrentView("search");
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleAiClassify = async () => {
    if (!uploadTitle && !uploadFile) {
      showToast("Please enter a document title or select a file first.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle || uploadFile?.name,
          content: uploadDesc,
        }),
      });
      const data = await res.json();
      if (data.category) {
        const foundCat = categories.find((c) => c.name.toLowerCase().includes(data.category.toLowerCase()));
        if (foundCat) setUploadCategory(foundCat.id);
      }
      if (data.department) {
        const foundDept = departments.find((d) => d.name.toLowerCase().includes(data.department.toLowerCase()));
        if (foundDept) setUploadDept(foundDept.id);
      }
      if (data.tags && Array.isArray(data.tags)) {
        setUploadTags(data.tags.join(", "));
      }
      showToast("AI Classification suggested successfully!");
    } catch (err) {
      console.error("AI classify error:", err);
      showToast("AI suggestion failed. Try manual categorization.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle) {
      showToast("Please provide a document title.");
      return;
    }

    try {
      let ocrText = "";
      if (useOcr && uploadFile) {
        // simulate OCR via backend
        const reader = new FileReader();
        reader.readAsDataURL(uploadFile);
        await new Promise((resolve) => (reader.onload = resolve));
        const base64 = (reader.result as string)?.split(",")[1];

        const ocrRes = await fetch("/api/ai/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, filename: uploadFile.name }),
        });
        const ocrData = await ocrRes.json();
        ocrText = ocrData.ocrText;
      }

      const fileType = uploadFile ? uploadFile.name.split(".").pop()?.toUpperCase() || "PDF" : "PDF";
      const mimeType = uploadFile ? uploadFile.type : "application/pdf";
      const fileSize = uploadFile ? uploadFile.size : 1500000;

      const payload = {
        title: uploadTitle,
        description: uploadDesc,
        original_filename: uploadFile ? uploadFile.name : `${uploadTitle.toLowerCase().replace(/\s+/g, "_")}.pdf`,
        file_type: fileType,
        mime_type: mimeType,
        file_size: fileSize,
        category_id: uploadCategory,
        department_id: uploadDept,
        author: uploadAuthor || currentUser?.full_name || "Admin",
        access_level: uploadAccess,
        extracted_text: uploadDesc + " " + uploadTitle,
        ocr_text: ocrText,
        tags: uploadTags ? uploadTags.split(",").map((t) => t.trim()) : ["office", "ukana"],
      };

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast("Document uploaded and indexed successfully!");
        setUploadTitle("");
        setUploadDesc("");
        setUploadFile(null);
        setUploadTags("");
        setUseOcr(false);
        fetchMetadata();
        setCurrentView("documents");
      } else {
        const errData = await res.json();
        showToast(errData.error || "Upload failed.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("An error occurred during upload.");
    }
  };

  const handleDownload = async (doc: DocumentItem) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/download`);
      const data = await res.json();
      showToast(`Downloading file: ${doc.original_filename}`);
      // Simulate anchor download
      const element = document.createElement("a");
      const file = new Blob([doc.extracted_text || doc.title], { type: doc.mime_type });
      element.href = URL.createObjectURL(file);
      element.download = doc.original_filename;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      fetchMetadata();
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Document deleted successfully.");
        fetchMetadata();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to delete.");
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await fetch("/api/audit-logs");
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
          <span className="text-lg font-medium">Loading Federal Poly Ukana SDRS...</span>
        </div>
      </div>
    );
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-700 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-900/30">
              FP
            </div>
            <div>
              <h1 className="text-white font-bold text-base tracking-tight">SDRS</h1>
              <p className="text-xs text-slate-400 font-medium">Federal Poly Ukana Admin</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Workspace</p>
          <button
            onClick={() => {
              setCurrentView("dashboard");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === "dashboard" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => {
              setCurrentView("documents");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === "documents" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            Documents Repository
          </button>
          {currentUser?.role !== "Viewer" && (
            <button
              onClick={() => {
                setCurrentView("upload");
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                currentView === "upload" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Document
            </button>
          )}
          <button
            onClick={() => {
              setCurrentView("search");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === "search" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Search className="w-4 h-4" />
            Intelligent Search
          </button>
          <button
            onClick={() => {
              setCurrentView("categories");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === "categories" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <Folder className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={() => {
              setCurrentView("reports");
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === "reports" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Reports & Analytics
          </button>

          {currentUser?.role === "Administrator" && (
            <>
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 mt-6 mb-2">Administration</p>
              <button
                onClick={() => {
                  setCurrentView("users");
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === "users" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <Users className="w-4 h-4" />
                User Management
              </button>
              <button
                onClick={() => {
                  setCurrentView("audit-logs");
                  loadAuditLogs();
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentView === "audit-logs" ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Audit Trail Logs
              </button>
            </>
          )}
        </nav>

        {/* User Footer Profile & Role Switcher */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-emerald-400 font-bold text-xs">
                {currentUser?.full_name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{currentUser?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{currentUser?.department}</p>
              </div>
            </div>
          </div>

          <div className="mb-2">
            <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Switch Demo Role:</label>
            <select
              value={currentUser?.role}
              onChange={(e) => switchRole(e.target.value as any)}
              className="w-full bg-slate-800 text-slate-200 text-xs rounded px-2 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="Administrator">Administrator (Full Access)</option>
              <option value="Editor">Editor (Dept & Uploads)</option>
              <option value="Viewer">Viewer (Read Only)</option>
            </select>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-slate-600 hover:text-slate-900">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                School of Applied Science Admin Office
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
              <span>Role:</span>
              <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{currentUser?.role}</span>
            </div>
            {currentUser?.role !== "Viewer" && (
              <button
                onClick={() => setCurrentView("upload")}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Upload Document
              </button>
            )}
          </div>
        </header>

        {/* View Router */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* DASHBOARD VIEW */}
          {currentView === "dashboard" && reports && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Good morning, {currentUser?.full_name.split(" ")[1] || currentUser?.full_name}
                </h2>
                <p className="text-sm text-slate-500">
                  Federal Polytechnic Ukana Smart Document Retrieval System Overview.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Documents</span>
                    <FileText className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalDocs}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">+12% from last month</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">System Users</span>
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalUsers}</p>
                  <p className="text-xs text-slate-500 mt-1">Across 6 administrative units</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Storage Usage</span>
                    <HardDrive className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalStorageMB} MB</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Secure Cloud Repository</p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Retrieval Count</span>
                    <Search className="w-5 h-5 text-amber-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalDownloads + reports.totalViews}</p>
                  <p className="text-xs text-amber-600 mt-1 font-medium">High search efficiency</p>
                </div>
              </div>

              {/* Quick Search Banner */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                <h3 className="text-lg font-bold mb-1">Intelligent Contextual Retrieval</h3>
                <p className="text-xs text-slate-300 mb-4">
                  Ask the repository anything (e.g. "staff promotion committee 2026", "laboratory safety audit", "budget allocation").
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSearch();
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search documents by content, metadata, or conceptual topic..."
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-md"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* Recent Documents Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">Recently Added Documents</h3>
                  <button
                    onClick={() => setCurrentView("documents")}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    View All <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-6">Document Title</th>
                        <th className="py-3 px-6">Category</th>
                        <th className="py-3 px-6">File Type</th>
                        <th className="py-3 px-6">Access Level</th>
                        <th className="py-3 px-6">Date</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {documents.slice(0, 5).map((doc) => {
                        const cat = categories.find((c) => c.id === doc.category_id)?.name || "General";
                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-6 font-medium text-slate-900">
                              <button
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  setCurrentView("detail");
                                }}
                                className="hover:text-emerald-600 text-left font-medium"
                              >
                                {doc.title}
                              </button>
                            </td>
                            <td className="py-3.5 px-6 text-slate-600">{cat}</td>
                            <td className="py-3.5 px-6">
                              <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">{doc.file_type}</span>
                            </td>
                            <td className="py-3.5 px-6">
                              <span
                                className={`inline-flex items-center gap-1 font-medium ${
                                  doc.access_level === "Public"
                                    ? "text-emerald-700"
                                    : doc.access_level === "Confidential"
                                    ? "text-rose-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {doc.access_level === "Confidential" ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                {doc.access_level}
                              </span>
                            </td>
                            <td className="py-3.5 px-6 text-slate-500 tabular-nums">{doc.created_at.split("T")[0]}</td>
                            <td className="py-3.5 px-6 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedDocId(doc.id);
                                  setCurrentView("detail");
                                }}
                                className="text-slate-600 hover:text-slate-900 p-1"
                                title="Preview"
                              >
                                <Eye className="w-4 h-4 inline" />
                              </button>
                              <button onClick={() => handleDownload(doc)} className="text-emerald-600 hover:text-emerald-700 p-1" title="Download">
                                <Download className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENTS VIEW */}
          {currentView === "documents" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Documents Repository</h2>
                  <p className="text-xs text-slate-500">Centralized office file management with metadata and search filters.</p>
                </div>
                {currentUser?.role !== "Viewer" && (
                  <button
                    onClick={() => setCurrentView("upload")}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm self-start"
                  >
                    <Plus className="w-4 h-4" /> Upload New Document
                  </button>
                )}
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 shadow-xs">
                <input
                  type="text"
                  placeholder="Filter documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={searchDepartment}
                  onChange={(e) => setSearchDepartment(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={searchFileType}
                  onChange={(e) => setSearchFileType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">All File Types</option>
                  <option value="PDF">PDF</option>
                  <option value="DOCX">DOCX</option>
                  <option value="XLSX">XLSX</option>
                </select>
              </div>

              {/* Documents Grid / Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-6">Document Title</th>
                        <th className="py-3 px-6">Category</th>
                        <th className="py-3 px-6">Department</th>
                        <th className="py-3 px-6">Type & Size</th>
                        <th className="py-3 px-6">Access</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {documents
                        .filter((d) => {
                          if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
                          if (searchCategory && d.category_id !== searchCategory) return false;
                          if (searchDepartment && d.department_id !== searchDepartment) return false;
                          if (searchFileType && d.file_type.toLowerCase() !== searchFileType.toLowerCase()) return false;
                          return true;
                        })
                        .map((doc) => {
                          const cat = categories.find((c) => c.id === doc.category_id)?.name || "General";
                          const dept = departments.find((dp) => dp.id === doc.department_id)?.name || "Admin";
                          return (
                            <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-6 font-medium text-slate-900">
                                <button
                                  onClick={() => {
                                    setSelectedDocId(doc.id);
                                    setCurrentView("detail");
                                  }}
                                  className="hover:text-emerald-600 text-left font-medium"
                                >
                                  {doc.title}
                                </button>
                                <p className="text-[11px] text-slate-400 font-normal truncate max-w-xs">{doc.description}</p>
                              </td>
                              <td className="py-3.5 px-6 text-slate-600">{cat}</td>
                              <td className="py-3.5 px-6 text-slate-600">{dept}</td>
                              <td className="py-3.5 px-6">
                                <span className="font-mono text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700">{doc.file_type}</span>
                                <span className="text-[11px] text-slate-400 ml-2">{(doc.file_size / 1000000).toFixed(1)} MB</span>
                              </td>
                              <td className="py-3.5 px-6">
                                <span
                                  className={`inline-flex items-center gap-1 font-medium ${
                                    doc.access_level === "Public"
                                      ? "text-emerald-700"
                                      : doc.access_level === "Confidential"
                                      ? "text-rose-700"
                                      : "text-amber-700"
                                  }`}
                                >
                                  {doc.access_level}
                                </span>
                              </td>
                              <td className="py-3.5 px-6 text-right space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedDocId(doc.id);
                                    setCurrentView("detail");
                                  }}
                                  className="text-slate-600 hover:text-slate-900 p-1"
                                  title="Preview"
                                >
                                  <Eye className="w-4 h-4 inline" />
                                </button>
                                <button onClick={() => handleDownload(doc)} className="text-emerald-600 hover:text-emerald-700 p-1" title="Download">
                                  <Download className="w-4 h-4 inline" />
                                </button>
                                {currentUser?.role === "Administrator" && (
                                  <button onClick={() => handleDeleteDoc(doc.id)} className="text-rose-600 hover:text-rose-700 p-1" title="Delete">
                                    <Trash2 className="w-4 h-4 inline" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD DOCUMENT VIEW */}
          {currentView === "upload" && currentUser?.role !== "Viewer" && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Upload Office Document</h2>
                <p className="text-xs text-slate-500">Upload PDF, DOCX, XLSX, TXT, or scanned images with OCR & AI auto-classification.</p>
              </div>

              <form onSubmit={handleUploadSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                {/* Drag and drop zone */}
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <Upload className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700">Drag and drop document file here, or browse</p>
                  <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, XLSX, TXT, JPEG, PNG up to 25MB</p>
                  <input
                    type="file"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const f = e.target.files[0];
                        setUploadFile(f);
                        if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }}
                    className="mt-4 text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {uploadFile && (
                    <p className="text-xs font-medium text-emerald-600 mt-2">Selected: {uploadFile.name}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAiClassify}
                    disabled={aiLoading}
                    className="bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    {aiLoading ? "AI Analyzing..." : "AI Auto-Classify & Tag Suggestion"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Document Title *</label>
                    <input
                      type="text"
                      required
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      placeholder="e.g. 2026 Promotion Report"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Author / Origin</label>
                    <input
                      type="text"
                      value={uploadAuthor}
                      onChange={(e) => setUploadAuthor(e.target.value)}
                      placeholder="e.g. Bursary Department"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Summary</label>
                  <textarea
                    rows={3}
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    placeholder="Brief summary of document contents..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={uploadDept}
                      onChange={(e) => setUploadDept(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Access Level</label>
                    <select
                      value={uploadAccess}
                      onChange={(e) => setUploadAccess(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Public">Public</option>
                      <option value="Department Only">Department Only</option>
                      <option value="Restricted">Restricted</option>
                      <option value="Confidential">Confidential</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="promotion, staff, 2026, admin"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="ocrCheck"
                    checked={useOcr}
                    onChange={(e) => setUseOcr(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <label htmlFor="ocrCheck" className="text-xs font-medium text-slate-700">
                    Enable OCR Text Extraction (for scanned documents / images)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setCurrentView("documents")}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Upload and Index Document
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* INTELLIGENT SEARCH VIEW */}
          {currentView === "search" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Intelligent Retrieval & Search</h2>
                <p className="text-xs text-slate-500">Hybrid full-text, metadata, and conceptual semantic search engine.</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <form onSubmit={handleSearch} className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Ask or search e.g. 'staff promotion committee discussed in 2026'..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-sm transition-colors"
                  >
                    Search Repository
                  </button>
                </form>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <select
                    value={searchCategory}
                    onChange={(e) => setSearchCategory(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={searchDepartment}
                    onChange={(e) => setSearchDepartment(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={searchFileType}
                    onChange={(e) => setSearchFileType(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700"
                  >
                    <option value="">All File Formats</option>
                    <option value="PDF">PDF</option>
                    <option value="DOCX">DOCX</option>
                    <option value="XLSX">XLSX</option>
                  </select>
                </div>
              </div>

              {/* Search Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Search Results ({searchResults.length} found)
                  </p>
                </div>

                {searchResults.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                    <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-700">No matching documents found</p>
                    <p className="text-xs text-slate-400 mt-1">Try refining your search terms or filters.</p>
                  </div>
                ) : (
                  searchResults.map((doc) => {
                    const cat = categories.find((c) => c.id === doc.category_id)?.name || "General";
                    return (
                      <div key={doc.id} className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{doc.file_type}</span>
                            <span className="text-xs text-slate-500">· {cat}</span>
                            {doc.matchScore && (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                Match: {doc.matchScore}%
                              </span>
                            )}
                          </div>
                          <h4
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setCurrentView("detail");
                            }}
                            className="font-bold text-slate-900 text-base cursor-pointer hover:text-emerald-600 transition-colors"
                          >
                            {doc.title}
                          </h4>
                          <p className="text-xs text-slate-600 line-clamp-2">{doc.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {doc.tags.map((t, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            onClick={() => {
                              setSelectedDocId(doc.id);
                              setCurrentView("detail");
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* CATEGORIES VIEW */}
          {currentView === "categories" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">Document Categories</h2>
                  <p className="text-xs text-slate-500">Configurable administrative office filing classifications.</p>
                </div>
                {currentUser?.role === "Administrator" && (
                  <button
                    onClick={() => {
                      const name = prompt("Enter new category name:");
                      const desc = prompt("Enter category description:");
                      if (name) {
                        fetch("/api/categories", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name, description: desc }),
                        }).then(() => fetchMetadata());
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((cat) => {
                  const count = documents.filter((d) => d.category_id === cat.id && d.status !== "Deleted").length;
                  return (
                    <div key={cat.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <Folder className="w-6 h-6 text-emerald-600" />
                        <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                          {count} Documents
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{cat.name}</h3>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* REPORTS VIEW */}
          {currentView === "reports" && reports && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Reports & System Analytics</h2>
                <p className="text-xs text-slate-500">Document activity, storage usage, and departmental statistics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Downloads</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalDownloads}</p>
                  <p className="text-xs text-emerald-600 mt-1 font-medium">Active staff retrieval</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Document Views</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalViews}</p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Frequent online previews</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Storage Footprint</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2 tabular-nums">{reports.totalStorageMB} MB</p>
                  <p className="text-xs text-indigo-600 mt-1 font-medium">Optimized secure storage</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Documents by Category</h3>
                  <div className="space-y-3">
                    {reports.byCategory.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span>{item.categoryName}</span>
                          <span className="tabular-nums font-semibold">{item.count} docs</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-full rounded-full"
                            style={{ width: `${Math.min((item.count / (reports.totalDocs || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Monthly Upload Growth</h3>
                  <div className="space-y-3">
                    {reports.monthlyUploads.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium text-slate-700">
                          <span>{item.month} 2026</span>
                          <span className="tabular-nums font-semibold">{item.count} uploads</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full"
                            style={{ width: `${Math.min((item.count / 200) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS MANAGEMENT VIEW (ADMIN ONLY) */}
          {currentView === "users" && currentUser?.role === "Administrator" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">User Accounts & Roles</h2>
                  <p className="text-xs text-slate-500">Manage office staff access levels (Administrator, Editor, Viewer).</p>
                </div>
                <button
                  onClick={() => {
                    const full_name = prompt("Enter full name:");
                    const email = prompt("Enter email:");
                    const role = prompt("Enter role (Administrator / Editor / Viewer):") || "Viewer";
                    if (full_name && email) {
                      fetch("/api/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ full_name, email, role, department: "Administration" }),
                      }).then(() => fetchMetadata());
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add User
                </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-6">Staff Name</th>
                      <th className="py-3 px-6">Email</th>
                      <th className="py-3 px-6">Role</th>
                      <th className="py-3 px-6">Department</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Last Login</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-semibold text-slate-900">{usr.full_name}</td>
                        <td className="py-3.5 px-6 text-slate-600">{usr.email}</td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`font-semibold px-2.5 py-0.5 rounded-full text-[11px] ${
                              usr.role === "Administrator"
                                ? "bg-purple-50 text-purple-700"
                                : usr.role === "Editor"
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {usr.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-600">{usr.department}</td>
                        <td className="py-3.5 px-6">
                          <span className="text-emerald-600 font-medium">{usr.status}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500 tabular-nums">{usr.last_login}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AUDIT LOGS VIEW (ADMIN ONLY) */}
          {currentView === "audit-logs" && currentUser?.role === "Administrator" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Security Audit Trail Logs</h2>
                <p className="text-xs text-slate-500">Every important document access, upload, modification, and search activity.</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-6">User</th>
                      <th className="py-3 px-6">Action</th>
                      <th className="py-3 px-6">Document</th>
                      <th className="py-3 px-6">IP Address</th>
                      <th className="py-3 px-6">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-3.5 px-6 font-semibold text-slate-900">{log.user_name}</td>
                        <td className="py-3.5 px-6">
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">{log.action}</span>
                        </td>
                        <td className="py-3.5 px-6 text-slate-700 truncate max-w-xs">{log.document_title || "—"}</td>
                        <td className="py-3.5 px-6 font-mono text-slate-500">{log.ip_address}</td>
                        <td className="py-3.5 px-6 text-emerald-600 font-semibold">{log.result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOCUMENT DETAIL / PREVIEW VIEW */}
          {currentView === "detail" && selectedDoc && (
            <div className="max-w-4xl mx-auto space-y-6">
              <button
                onClick={() => setCurrentView("documents")}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                ← Back to Documents Repository
              </button>

              <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded">{selectedDoc.file_type}</span>
                      <span className="text-xs text-slate-500">· {(selectedDoc.file_size / 1000000).toFixed(2)} MB</span>
                      <span className="text-xs text-slate-500">· {selectedDoc.page_count} Pages</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{selectedDoc.title}</h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDownload(selectedDoc)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors"
                    >
                      <Download className="w-4 h-4" /> Download File
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-3">
                    <div>
                      <p className="text-slate-400 font-medium">Description</p>
                      <p className="text-slate-800 mt-1">{selectedDoc.description}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Author / Origin</p>
                      <p className="text-slate-800 mt-1 font-semibold">{selectedDoc.author}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Uploaded By</p>
                      <p className="text-slate-800 mt-1 font-semibold">{selectedDoc.uploaded_by}</p>
                    </div>
                  </div>

                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-slate-400 font-medium">Access Level</p>
                      <p className="text-slate-900 font-semibold mt-1">{selectedDoc.access_level}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Upload Date</p>
                      <p className="text-slate-800 mt-1 tabular-nums">{new Date(selectedDoc.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium">Tags</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedDoc.tags.map((t, i) => (
                          <span key={i} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-600">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extracted Text / OCR Viewer */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h3 className="font-bold text-slate-900 text-sm">Extracted Content & OCR Index</h3>
                  <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto leading-relaxed">
                    {selectedDoc.ocr_text || selectedDoc.extracted_text || "No text extracted for this format."}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
