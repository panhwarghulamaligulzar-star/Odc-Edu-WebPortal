import React, { useState, useEffect, useCallback } from "react";
import {
  FaUsers,
  FaCertificate,
  FaChalkboardTeacher,
  FaCalendarCheck,
  FaMale,
  FaFemale,
  FaUserGraduate,
  FaBookOpen,
  FaDollarSign,
  FaUserCheck,
  FaSyncAlt,
} from "react-icons/fa";
import { GrCertificate } from "react-icons/gr";
import { MdDashboard } from "react-icons/md";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, Row, Col, Button, Tooltip as AntTooltip } from "antd";
import LoaderSpnar from "../../components/loader/loaderSpnar";
import api from "../../api/axiosInstance";
import useZustandStore from "../../stores/zustandStore";

const Dashboard = () => {
  const { certifications } = useZustandStore();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalCourses: 0,
    maleStudents: 0,
    femaleStudents: 0,
    activeEnrollments: 0,
    completedEnrollments: 0,
    totalRevenue: 0,
    paidInstallments: 0,
    unpaidInstallments: 0,
    paidAmount: 0,
    unpaidAmount: 0,
    totalCertifications: 0,
    unpaidDetails: [],
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [
        studentsRes,
        teachersRes,
        coursesRes,
        certificationsRes,
        enrollmentRes,
        txnRes,
      ] = await Promise.all([
        api.get("/student/admissions", { params: { limit: 10000 } }),
        api.get("/teacher"),
        api.get("/course"),
        api.get("/student/certificates"),
        api.get("/enrollment"),
        api
          .get("/accounting/transactions", {
            params: {
              dateFrom: (() => {
                const d = new Date();
                d.setMonth(d.getMonth() - 11);
                d.setDate(1);
                return d.toISOString().split("T")[0];
              })(),
              limit: 5000,
            },
          })
          .catch(() => ({ data: { success: false, data: [] } })),
      ]);

      const students = studentsRes.data.success ? studentsRes.data.data : [];
      const teachers = teachersRes.data.success ? teachersRes.data.data : [];
      const courses = coursesRes.data.success ? coursesRes.data.data : [];
      const certificationsData = certificationsRes.data.success
        ? certificationsRes.data.data
        : [];
      const allEnrollments = enrollmentRes.data.success
        ? enrollmentRes.data.data
        : [];
      const allTxns = txnRes.data?.success ? txnRes.data.data : [];

      // Build monthly income/expense from transactions
      const MONTHS = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      const now = new Date();
      const monthlyMap = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthlyMap[key] = {
          month: `${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : ""}`,
          income: 0,
          expense: 0,
          net: 0,
        };
      }
      allTxns.forEach((t) => {
        const d = new Date(t.paymentDate);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (monthlyMap[key]) {
          if (t.type?.name === "Income")
            monthlyMap[key].income += t.amount || 0;
          else if (t.type?.name === "Expense")
            monthlyMap[key].expense += t.amount || 0;
          monthlyMap[key].net =
            monthlyMap[key].income - monthlyMap[key].expense;
        }
      });
      const computedMonthly = Object.values(monthlyMap);
      const hasData = computedMonthly.some(
        (m) => m.income > 0 || m.expense > 0,
      );
      if (hasData) setMonthlyRevenue(computedMonthly);

      // Build a studentId → name map — resolve multiple possible name fields
      const studentMap = {};
      students.forEach((s) => {
        const name = s.studentName || s.name || s.fullName || "";
        if (name) studentMap[s._id] = name;
      });

      const maleCount = students.filter(
        (s) => s.gender?.toLowerCase() === "male",
      ).length;
      const femaleCount = students.filter(
        (s) => s.gender?.toLowerCase() === "female",
      ).length;
      const activeEnrollments = allEnrollments.filter(
        (e) =>
          e.status?.toLowerCase() === "active" ||
          e.status?.toLowerCase() === "enrolled",
      ).length;
      const completedEnrollments = allEnrollments.filter(
        (e) => e.status?.toLowerCase() === "completed",
      ).length;

      let totalRevenue = 0;
      let paidCount = 0;
      let unpaidCount = 0;
      let paidAmount = 0;
      let unpaidAmount = 0;
      let unpaidDetailsArray = [];

      for (const enrollment of allEnrollments) {
        if (enrollment.feeStructure?.installments) {
          // Resolve student name: try multiple fields + studentMap fallback
          const stu = enrollment.student;
          const studentName =
            stu?.studentName ||
            stu?.name ||
            stu?.fullName ||
            studentMap[stu?._id] ||
            studentMap[String(stu || "")] ||
            "Unknown";
          const courseName = enrollment.course?.courseName || "Unknown Course";

          enrollment.feeStructure.installments.forEach((inst) => {
            if (inst.status?.toLowerCase() === "paid") {
              totalRevenue += inst.paidAmount || 0;
              paidAmount += inst.paidAmount || 0;
              paidCount++;
            } else {
              unpaidCount++;
              unpaidAmount += inst.amount || 0;
              unpaidDetailsArray.push({
                studentName,
                courseName,
                installmentNumber: inst.installmentNumber,
                amount: inst.amount,
                dueDate: inst.dueDate,
              });
            }
          });
        }
      }

      setDashboardData({
        totalStudents: students.length,
        totalTeachers: teachers.length,
        totalCourses: courses.length,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
        activeEnrollments,
        completedEnrollments,
        totalRevenue,
        paidInstallments: paidCount,
        unpaidInstallments: unpaidCount,
        paidAmount,
        unpaidAmount,
        totalCertifications: certificationsData.length,
        unpaidDetails: unpaidDetailsArray,
      });
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + re-fetch when user returns to tab
  useEffect(() => {
    fetchDashboardData();
    const onFocus = () => fetchDashboardData(true);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDashboardData]);

  // Chart data
  const genderData = [
    { name: "Male", value: dashboardData.maleStudents, color: "#3b82f6" },
    { name: "Female", value: dashboardData.femaleStudents, color: "#ec4899" },
  ];

  const enrollmentData = [
    {
      name: "Active",
      value: dashboardData.activeEnrollments,
      color: "#10b981",
    },
    {
      name: "Completed",
      value: dashboardData.completedEnrollments,
      color: "#6366f1",
    },
  ];

  // Payment Status â€” show PKR amounts (not raw counts)
  const paymentStatusData = [
    { name: "Collected", value: dashboardData.paidAmount, color: "#22c55e" },
    {
      name: "Outstanding",
      value: dashboardData.unpaidAmount,
      color: "#ef4444",
    },
  ];

  // Top 5 unpaid by amount â€” use real student name
  const topUnpaidInstallments = [...dashboardData.unpaidDetails]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((item) => ({
      name:
        item.studentName.length > 12
          ? item.studentName.substring(0, 12) + "..."
          : item.studentName,
      fullName: item.studentName,
      amount: item.amount,
      course: item.courseName,
    }));

  const cards = [
    {
      title: "Total Students",
      value: dashboardData.totalStudents,
      icon: FaUsers,
      color: "bg-[#01134C]",
      bgColor: "bg-blue-50",
      textColor: "text-[#01134C]",
    },
    {
      title: "Total Teachers",
      value: dashboardData.totalTeachers,
      icon: FaChalkboardTeacher,
      color: "bg-purple-500",
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
    },
    {
      title: "Total Courses",
      value: dashboardData.totalCourses,
      icon: FaBookOpen,
      color: "bg-green-500",
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    {
      title: "Certifications",
      value: dashboardData.totalCertifications,
      icon: GrCertificate,
      color: "bg-teal-500",
      bgColor: "bg-teal-50",
      textColor: "text-teal-600",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoaderSpnar />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[30px] pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdDashboard size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Dashboard</h2>
            <p className="module-subtitle">
              Welcome overview & key metrics
            </p>
          </div>
        </div>
        <AntTooltip title="Refresh all data">
          <Button
            icon={<FaSyncAlt className={refreshing ? "animate-spin" : ""} />}
            onClick={() => fetchDashboardData(true)}
            loading={refreshing}
            style={{
              background: "#01134C",
              color: "#E8FC0A",
              border: "none",
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>
        </AntTooltip>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg shadow-lg ${card.bgColor} border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">
                  {card.title}
                </h3>
                <p className={`text-3xl font-bold ${card.textColor} mb-2`}>
                  {card.value}
                </p>
              </div>
              <div
                className={`p-4 rounded-full ${card.color} text-white shadow-md`}
              >
                <card.icon size={28} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-full">
              <FaMale size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Male Students</p>
              <p className="text-2xl font-bold text-blue-600">
                {dashboardData.maleStudents}
              </p>
            </div>
          </div>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-100 rounded-full">
              <FaFemale size={24} className="text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Female Students</p>
              <p className="text-2xl font-bold text-pink-600">
                {dashboardData.femaleStudents}
              </p>
            </div>
          </div>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-full">
              <FaUserCheck size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Enrollments</p>
              <p className="text-2xl font-bold text-green-600">
                {dashboardData.activeEnrollments}
              </p>
            </div>
          </div>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 rounded-full">
              <FaUserGraduate size={24} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-indigo-600">
                {dashboardData.completedEnrollments}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 â€” Revenue Growth + Top Unpaid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth â€” real monthly income vs expense */}
        <Card
          title={
            <span style={{ color: "#01134C", fontWeight: 700 }}>
              Revenue Growth
              <span className="ml-2 text-xs font-normal text-gray-400">
                (last 12 months Â· from accounting)
              </span>
            </span>
          }
          className="shadow-lg"
        >
          {monthlyRevenue.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
              No accounting transactions found yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={monthlyRevenue}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `PKR ${value.toLocaleString()}`,
                    name === "income"
                      ? "Income"
                      : name === "expense"
                        ? "Expense"
                        : "Net",
                  ]}
                />
                <Legend
                  formatter={(value) =>
                    value === "income"
                      ? "Income"
                      : value === "expense"
                        ? "Expense"
                        : "Net"
                  }
                />
                <Bar
                  dataKey="income"
                  fill="#16a34a"
                  radius={[4, 4, 0, 0]}
                  name="income"
                />
                <Bar
                  dataKey="expense"
                  fill="#dc2626"
                  radius={[4, 4, 0, 0]}
                  name="expense"
                />
                <Line
                  dataKey="net"
                  type="monotone"
                  stroke="#01134C"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="net"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Top Unpaid Installments */}
        <Card title="Top Unpaid Installments" className="shadow-lg">
          {topUnpaidInstallments.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-green-600 font-semibold text-sm">
              âœ“ No unpaid installments
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topUnpaidInstallments} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tickFormatter={(v) =>
                    v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                  }
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value) => [
                    `PKR ${value.toLocaleString()}`,
                    "Amount",
                  ]}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName || label
                  }
                />
                <Bar dataKey="amount" fill="#ef4444" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Charts Row 2 â€” Gender + Enrollment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Gender Distribution" className="shadow-lg">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={genderData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                dataKey="value"
              >
                {genderData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Enrollment Status" className="shadow-lg">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={enrollmentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                dataKey="value"
              >
                {enrollmentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Payment Status Overview â€” correct PKR amounts */}
      <Card
        title={
          <span style={{ color: "#01134C", fontWeight: 700 }}>
            Payment Status Overview
          </span>
        }
        className="shadow-lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
            <p className="text-sm text-gray-500 mb-1">Collected (PKR)</p>
            <p className="text-2xl font-bold text-green-600">
              {dashboardData.paidAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {dashboardData.paidInstallments} installments paid
            </p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-gray-500 mb-1">Outstanding (PKR)</p>
            <p className="text-2xl font-bold text-red-600">
              {dashboardData.unpaidAmount.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {dashboardData.unpaidInstallments} installments pending
            </p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-sm text-gray-500 mb-1">Collection Rate</p>
            <p className="text-2xl font-bold text-blue-600">
              {dashboardData.paidAmount + dashboardData.unpaidAmount > 0
                ? (
                    (dashboardData.paidAmount /
                      (dashboardData.paidAmount + dashboardData.unpaidAmount)) *
                    100
                  ).toFixed(1)
                : "0.0"}
              %
            </p>
            <p className="text-xs text-gray-400 mt-1">of total expected fees</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart
            data={paymentStatusData}
            layout="vertical"
            margin={{ left: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
              }
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={100}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value) => [`PKR ${value.toLocaleString()}`, "Amount"]}
            />
            <Bar dataKey="value" radius={[0, 8, 8, 0]}>
              {paymentStatusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

export default Dashboard;
