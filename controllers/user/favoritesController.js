/**
 * Favorites Controller
 * Handles user favorites functionality
 */

import User from '../../models/user.js';
import Ad from '../../models/ad.js';
import mongoose from 'mongoose';

/**
 * Add ad to user favorites
 * POST /api/user/favorites/:adId
 */
export const addToFavorites = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.user.userId;

    // Validate adId format
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy ID ogłoszenia'
      });
    }

    // Check if ad exists and is active
    const ad = await Ad.findOne({ 
      _id: adId, 
      status: { $in: ['active', 'opublikowane', 'pending'] }
    });

    if (!ad) {
      return res.status(404).json({
        success: false,
        message: 'Ogłoszenie nie zostało znalezione lub nie jest opublikowane'
      });
    }

    // Check if user is trying to add their own ad to favorites
    if (ad.owner && ad.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Nie możesz dodać własnego ogłoszenia do ulubionych'
      });
    }

    // Find user and check if ad is already in favorites
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if already in favorites
    const isAlreadyFavorite = user.favorites.some(
      favoriteId => favoriteId.toString() === adId
    );

    if (isAlreadyFavorite) {
      return res.status(400).json({
        success: false,
        message: 'Ogłoszenie jest już w ulubionych'
      });
    }

    // Add to favorites
    user.favorites.push(adId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Ogłoszenie zostało dodane do ulubionych',
      data: {
        adId,
        favoritesCount: user.favorites.length
      }
    });

  } catch (error) {
    console.error('Error adding to favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas dodawania do ulubionych'
    });
  }
};

/**
 * Remove ad from user favorites
 * DELETE /api/user/favorites/:adId
 */
export const removeFromFavorites = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.user.userId;

    // Validate adId format
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy ID ogłoszenia'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if ad is in favorites
    const favoriteIndex = user.favorites.findIndex(
      favoriteId => favoriteId.toString() === adId
    );

    if (favoriteIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'Ogłoszenie nie znajduje się w ulubionych'
      });
    }

    // Remove from favorites
    user.favorites.splice(favoriteIndex, 1);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Ogłoszenie zostało usunięte z ulubionych',
      data: {
        adId,
        favoritesCount: user.favorites.length
      }
    });

  } catch (error) {
    console.error('Error removing from favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas usuwania z ulubionych'
    });
  }
};

/**
 * Toggle ad in user favorites (add if not present, remove if present)
 * POST /api/user/favorites/:adId/toggle
 */
export const toggleFavorite = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.user.userId;

    // Validate adId format
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy ID ogłoszenia'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if ad is in favorites
    const favoriteIndex = user.favorites.findIndex(
      favoriteId => favoriteId.toString() === adId
    );

    let action, message;

    if (favoriteIndex === -1) {
      // Add to favorites
      // First check if ad exists and is active
      const ad = await Ad.findOne({ 
        _id: adId, 
        status: { $in: ['active', 'opublikowane', 'pending'] }
      });

      if (!ad) {
        return res.status(404).json({
          success: false,
          message: 'Ogłoszenie nie zostało znalezione lub nie jest opublikowane'
        });
      }

      // Check if user is trying to add their own ad to favorites
      if (ad.owner && ad.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Nie możesz dodać własnego ogłoszenia do ulubionych'
        });
      }

      user.favorites.push(adId);
      action = 'added';
      message = 'Ogłoszenie zostało dodane do ulubionych';
    } else {
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1);
      action = 'removed';
      message = 'Ogłoszenie zostało usunięte z ulubionych';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message,
      data: {
        adId,
        action,
        isFavorite: action === 'added',
        favoritesCount: user.favorites.length
      }
    });

  } catch (error) {
    console.error('Error toggling favorite:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas zmiany statusu ulubionego'
    });
  }
};

/**
 * Get user's favorite ads
 * GET /api/user/favorites
 */
export const getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'asc' ? 1 : -1;

    // Get user with populated favorites
    const user = await User.findById(userId)
      .populate({
        path: 'favorites',
        match: { status: { $in: ['active', 'opublikowane', 'pending'] } }, // Only show active ads
        select: '_id brand model headline shortDescription images mainImage price year mileage fuelType power transmission status listingType createdAt views',
        options: {
          sort: { [sortBy]: sortOrder },
          skip: skip,
          limit: parseInt(limit)
        }
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Filter out null values (ads that were deleted or unpublished)
    const validFavorites = user.favorites.filter(ad => ad !== null);

    // Get total count of valid favorites
    const totalFavorites = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$favorites' },
      {
        $lookup: {
          from: 'ads',
          localField: 'favorites',
          foreignField: '_id',
          as: 'ad'
        }
      },
      { $unwind: '$ad' },
      { $match: { 'ad.status': { $in: ['active', 'opublikowane', 'pending'] } } },
      { $count: 'total' }
    ]);

    const totalCount = totalFavorites.length > 0 ? totalFavorites[0].total : 0;

    // Add title field from headline for frontend compatibility
    const favoritesWithTitle = validFavorites.map(ad => ({
      ...ad.toObject(),
      title: ad.headline ? ad.headline.substring(0, 120) : ''
    }));

    res.status(200).json({
      success: true,
      data: {
        favorites: favoritesWithTitle,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting user favorites:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania ulubionych ogłoszeń'
    });
  }
};

/**
 * Check if ad is in user's favorites
 * GET /api/user/favorites/:adId/check
 */
export const checkIsFavorite = async (req, res) => {
  try {
    const { adId } = req.params;
    const userId = req.user.userId;

    // Validate adId format
    if (!mongoose.Types.ObjectId.isValid(adId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy ID ogłoszenia'
      });
    }

    // Find user
    const user = await User.findById(userId).select('favorites');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie został znaleziony'
      });
    }

    // Check if ad is in favorites
    const isFavorite = user.favorites.some(
      favoriteId => favoriteId.toString() === adId
    );

    res.status(200).json({
      success: true,
      data: {
        adId,
        isFavorite,
        favoritesCount: user.favorites.length
      }
    });

  } catch (error) {
    console.error('Error checking favorite status:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas sprawdzania statusu ulubionego'
    });
  }
};

/**
 * Get favorites count for user
 * GET /api/user/favorites/count
 */
export const getFavoritesCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get count of valid favorites (published ads only)
    const favoritesCount = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userId) } },
      { $unwind: '$favorites' },
      {
        $lookup: {
          from: 'ads',
          localField: 'favorites',
          foreignField: '_id',
          as: 'ad'
        }
      },
      { $unwind: '$ad' },
      { $match: { 'ad.status': { $in: ['active', 'opublikowane', 'pending'] } } },
      { $count: 'total' }
    ]);

    const totalCount = favoritesCount.length > 0 ? favoritesCount[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        count: totalCount
      }
    });

  } catch (error) {
    console.error('Error getting favorites count:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas pobierania liczby ulubionych'
    });
  }
};
