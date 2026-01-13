import React, { useEffect, useState } from 'react';
import { fetchSchemas } from '../services/api';

const SchemaList = ({ collectionName, onSelectSchema }) => {
  const [schemas, setSchemas] = useState([]);

  useEffect(() => {
    const getSchemas = async () => {
      try {
        const data = await fetchSchemas(collectionName);
        setSchemas(data);
      } catch (error) {
        console.error(`Error fetching schemas for ${collectionName}:`, error);
      }
    };
    getSchemas();
  }, [collectionName]);

  return (
    <div>
      <h2>Select a Schema</h2>
      <ul>
        {schemas.map(schema => (
          <li key={schema.schema_name} onClick={() => onSelectSchema(schema.schema_name)}>
            {schema.schema_name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default SchemaList;
