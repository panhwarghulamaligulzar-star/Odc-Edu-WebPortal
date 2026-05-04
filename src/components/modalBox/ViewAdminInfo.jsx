import React, { useEffect, useState } from 'react'

const ViewAdminInfo = ({selectedAdmin}) => {
  return (
     <div className="flex gap-[30px] justify-start items-center">
            <div className="flex flex-col items-center">
             <img
              src={
                selectedAdmin?.profile
                  ? `data:image/jpeg;base64,${selectedAdmin.profile}`
                  : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdIx5P4tKEkAg4YGcDZbqkaQ3EzfNfZrPOCw&s"
              }
              alt="Profile"
              className="w-[100px] h-[100px] rounded-[10px] object-cover border border-primary"
            />
            </div>
            <div> <h4 className='h4 uppercase !text-[18px] opacity-60'>name {selectedAdmin?.name}</h4>
            <h4 className='h4 uppercase !text-[14px] opacity-60 mt-[-10px]'>Email {selectedAdmin?.email}</h4>
            <h4 className='h4 uppercase !text-[14px] opacity-60 mt-[-10px]'>Role {selectedAdmin?.role} Admin</h4>
            </div>
           
    </div>
  )
}

export default ViewAdminInfo
