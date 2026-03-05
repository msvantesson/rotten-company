// Updated route.ts file

// ... other code

const submitEvidence = async (req, res) => {
  const { cat, ...otherFields } = req.body;

  try {
    await db.evidence.create({
      ...otherFields,
      category_id: cat.id, // Changed from category to category_id
    });
    res.status(200).send('Evidence submitted successfully.');
  } catch (error) {
    res.status(500).send('Error submitting evidence.');
  }
};

// ... other code
