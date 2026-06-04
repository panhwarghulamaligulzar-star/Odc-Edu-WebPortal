import { Button, Modal } from "antd";
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { MdAssignment } from "react-icons/md";
import EnrollmentForm from "../../components/forms/EnrollmentForm";

const Enrollments = () => {
  const [EnrollmentModal, setIsEnrollmentModal] = useState(false);
  return (
    <>
      <Modal
        title={<h4 className="h4 py-[12px]">Create New Enrollment</h4>}
        open={EnrollmentModal}
        onCancel={() => setIsEnrollmentModal(false)}
        maskClosable
        footer={null}
        width={600}
        centered
      >
        <div
          style={{ maxHeight: "800px", overflowY: "auto", paddingRight: "8px" }}
        >
          <EnrollmentForm />
        </div>
      </Modal>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: "#01134C" }}
          >
            <MdAssignment size={22} style={{ color: "#E8FC0A" }} />
          </div>
          <div>
            <h2 className="module-title">Enrollments</h2>
            <p className="module-subtitle">
              Student course enrollments
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsEnrollmentModal(true)}
            type="default"
            icon={<FaPlus />}
            className="btn-lg hover:!bg-blue-900 hover:!text-[#ffff]"
          >
            Create New Enrollments
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2 text-left">Student Name</th>
                <th className="border px-4 py-2 text-left">Father Name</th>
                <th className="border px-4 py-2 text-left">Course</th>
                <th className="border px-4 py-2 text-left">Duration</th>
                <th className="border px-4 py-2 text-left">Fee</th>
                <th className="border px-4 py-2 text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              <tr className="hover:bg-gray-50">
                <td className="border px-4 py-2">Usman Ali</td>
                <td className="border px-4 py-2">Muhammad Ali</td>
                <td className="border px-4 py-2">Web Development</td>
                <td className="border px-4 py-2">3 Months</td>
                <td className="border px-4 py-2">PKR 25,000</td>
                <td className="border px-4 py-2">
                  <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                    Active
                  </span>
                </td>
              </tr>

              <tr className="hover:bg-gray-50">
                <td className="border px-4 py-2">Ayesha Khan</td>
                <td className="border px-4 py-2">Imran Khan</td>
                <td className="border px-4 py-2">Graphic Design</td>
                <td className="border px-4 py-2">2 Months</td>
                <td className="border px-4 py-2">PKR 18,000</td>
                <td className="border px-4 py-2">
                  <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
                    Pending
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Enrollments;
