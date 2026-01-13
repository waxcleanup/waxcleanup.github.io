import React, { useEffect, useState } from 'react';
import { fetchCollections } from '../services/api';

const CollectionList = ({ onSelectCollection }) => {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    const getCollections = async () => {
      try {
        const data = await fetchCollections();
        setCollections(data);
      } catch (error) {
        console.error("Error fetching collections:", error);
      }
    };
    getCollections();
  }, []);

  return (
    <div>
      <h2>Select a Collection</h2>
      <ul>
        {collections.map(collection => (
          <li key={collection.collection_name} onClick={() => onSelectCollection(collection.collection_name)}>
            {collection.collection_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CollectionList;
