import React, { useState } from 'react';
import { MayaButton } from './MayaButton';
import { MayaPanel } from './MayaPanel';

export const MayaWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <MayaPanel isOpen={isOpen} onClose={handleClose} />
      <MayaButton isOpen={isOpen} onClick={toggleOpen} />
    </>
  );
};

export default MayaWidget;
