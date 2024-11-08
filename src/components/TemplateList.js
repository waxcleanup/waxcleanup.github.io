import React, { useEffect, useState } from 'react';
import { fetchTemplates } from '../services/api';

const TemplateList = ({ collectionName, schemaName }) => {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const getTemplates = async () => {
      try {
        const data = await fetchTemplates(collectionName, schemaName);
        setTemplates(data);
      } catch (error) {
        console.error(`Error fetching templates for ${schemaName} in ${collectionName}:`, error);
      }
    };
    getTemplates();
  }, [collectionName, schemaName]);

  return (
    <div>
      <h2>Templates</h2>
      <ul>
        {templates.length > 0 ? (
          templates.map(template => (
            <li key={template.template_id}>{template.template_id}</li>
          ))
        ) : (
          <li>No templates available</li>
        )}
      </ul>
    </div>
  );
};

export default TemplateList;
