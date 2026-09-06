import React from 'react';
import { useParams, Navigate } from 'react-router-dom';

export const OutreachStudioPage: React.FC = () => {
  const { contentId } = useParams<{ contentId: string }>();
  const target = contentId
    ? `/?tab=outreach&contentId=${contentId}#summary-section`
    : `/?tab=outreach#summary-section`;

  return <Navigate to={target} replace />;
};

export default OutreachStudioPage;
