import React from 'react';
import CustomUrlSettings from '@/components/CustomUrlSettings';
import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
          &larr; Back to main page
        </Link>
        <h1 className="text-2xl font-bold mb-2">Research Admin</h1>
        <p className="text-gray-600">
          This page contains tools for testing and configuring the research system.
        </p>
      </div>
      
      <div className="mb-8">
        <CustomUrlSettings />
      </div>
    </div>
  );
} 