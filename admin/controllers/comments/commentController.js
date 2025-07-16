// controllers/admin/commentController.js
/**
 * Kontroler do zarządzania komentarzami przez administratora
 * Controller for managing comments by administrator
 */

import Comment from '../../models/comment.js';
import Ad from '../../models/ad.js';
import User from '../../models/user.js';

/**
 * Pobiera listę komentarzy z możliwością filtrowania i paginacji
 * Retrieves a list of comments with filtering and pagination options
 */
export const getComments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status,
      adId,
      userId,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Przygotuj zapytanie / Prepare query
    const query = {};
    
    // Filtrowanie po statusie / Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filtrowanie po ogłoszeniu / Filter by ad
    if (adId) {
      query.ad = adId;
    }
    
    // Filtrowanie po użytkowniku / Filter by user
    if (userId) {
      query.user = userId;
    }
    
    // Wyszukiwanie po treści / Search by content
    if (search) {
      query.content = { $regex: search, $options: 'i' };
    }
    
    // Przygotuj opcje sortowania / Prepare sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pobierz całkowitą liczbę pasujących komentarzy / Get total count of matching comments
    const total = await Comment.countDocuments(query);
    
    // Pobierz komentarze z paginacją / Get comments with pagination
    const comments = await Comment.find(query)
      .populate('user', 'email name lastName')
      .populate('ad', 'title')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    return res.status(200).json({
      comments,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania listy komentarzy:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy komentarzy.' });
  }
};

/**
 * Pobiera szczegóły pojedynczego komentarza
 * Retrieves details of a single comment
 */
export const getCommentDetails = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    const comment = await Comment.findById(commentId)
      .populate('user', 'email name lastName')
      .populate('ad', 'title description');
    
    if (!comment) {
      return res.status(404).json({ message: 'Komentarz nie został znaleziony.' });
    }
    
    return res.status(200).json({ comment });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów komentarza:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania szczegółów komentarza.' });
  }
};

/**
 * Aktualizuje status komentarza (zatwierdzenie/odrzucenie)
 * Updates comment status (approve/reject)
 */
export const updateCommentStatus = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { status, moderationNote } = req.body;
    
    // Sprawdź czy komentarz istnieje / Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Komentarz nie został znaleziony.' });
    }
    
    // Aktualizuj status / Update status
    comment.status = status;
    
    // Dodaj notatkę moderatora, jeśli podano / Add moderator note if provided
    if (moderationNote) {
      comment.moderationNote = moderationNote;
    }
    
    // Zapisz datę moderacji / Save moderation date
    comment.moderatedAt = new Date();
    comment.moderatedBy = req.user.userId;
    
    await comment.save();
    
    return res.status(200).json({ 
      message: `Komentarz został ${status === 'approved' ? 'zatwierdzony' : 'odrzucony'}.`,
      comment
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji statusu komentarza:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji statusu komentarza.' });
  }
};

/**
 * Usuwa komentarz
 * Deletes a comment
 */
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Sprawdź czy komentarz istnieje / Check if comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Komentarz nie został znaleziony.' });
    }
    
    await Comment.findByIdAndDelete(commentId);
    
    return res.status(200).json({ message: 'Komentarz został usunięty.' });
  } catch (error) {
    console.error('Błąd podczas usuwania komentarza:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania komentarza.' });
  }
};

/**
 * Masowe zatwierdzanie lub odrzucanie komentarzy
 * Bulk approve or reject comments
 */
export const bulkUpdateComments = async (req, res) => {
  try {
    const { commentIds, status, moderationNote } = req.body;
    
    if (!Array.isArray(commentIds) || commentIds.length === 0) {
      return res.status(400).json({ message: 'Nie podano poprawnej listy komentarzy.' });
    }
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Nieprawidłowy status. Dozwolone wartości: approved, rejected.' });
    }
    
    // Aktualizuj wszystkie komentarze / Update all comments
    const updateData = {
      status,
      moderatedAt: new Date(),
      moderatedBy: req.user.userId
    };
    
    if (moderationNote) {
      updateData.moderationNote = moderationNote;
    }
    
    const result = await Comment.updateMany(
      { _id: { $in: commentIds } },
      { $set: updateData }
    );
    
    return res.status(200).json({ 
      message: `Zaktualizowano status ${result.modifiedCount} komentarzy na "${status === 'approved' ? 'zatwierdzony' : 'odrzucony'}".`
    });
  } catch (error) {
    console.error('Błąd podczas masowej aktualizacji komentarzy:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas masowej aktualizacji komentarzy.' });
  }
};
