// controllers/admin/reportController.js
/**
 * Kontroler do zarządzania zgłoszeniami przez administratora
 * Controller for managing reports by administrator
 */

import Report from '../../models/admin/report.js';
import User from '../../../models/user/user.js';
import Ad from '../../../models/listings/ad.js';
import Comment from '../../../models/listings/comment.js';
import Notification from '../../../models/communication/notification.js';

/**
 * Pobiera listę zgłoszeń z możliwością filtrowania i paginacji
 * Retrieves a list of reports with filtering and pagination options
 */
export const getReports = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      status,
      reportType,
      reason,
      sortBy = 'createdAt', 
      sortOrder = 'desc' 
    } = req.query;
    
    // Przygotuj zapytanie / Prepare query
    const query = {};
    
    // Filtrowanie po statusie / Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filtrowanie po typie zgłoszenia / Filter by report type
    if (reportType) {
      query.reportType = reportType;
    }
    
    // Filtrowanie po powodzie zgłoszenia / Filter by report reason
    if (reason) {
      query.reason = reason;
    }
    
    // Wyszukiwanie po opisie / Search by description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }
    
    // Przygotuj opcje sortowania / Prepare sort options
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    
    // Pobierz całkowitą liczbę pasujących zgłoszeń / Get total count of matching reports
    const total = await Report.countDocuments(query);
    
    // Pobierz zgłoszenia z paginacją / Get reports with pagination
    const reports = await Report.find(query)
      .populate('reporter', 'email name lastName')
      .populate('assignedTo', 'email name lastName')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Pobierz dodatkowe informacje o zgłoszonych elementach / Get additional info about reported items
    const populatedReports = await Promise.all(reports.map(async (report) => {
      const reportObj = report.toObject();
      
      // Pobierz informacje o zgłoszonym elemencie w zależności od typu / Get info about reported item based on type
      if (report.reportType === 'ad') {
        const ad = await Ad.findById(report.reportedItem).select('headline owner');
        if (ad) {
          reportObj.reportedItemDetails = {
            title: ad.headline,
            userId: ad.owner
          };
        }
      } else if (report.reportType === 'user') {
        const user = await User.findById(report.reportedItem).select('email name lastName');
        if (user) {
          reportObj.reportedItemDetails = {
            email: user.email,
            name: user.name,
            lastName: user.lastName
          };
        }
      } else if (report.reportType === 'comment') {
        const comment = await Comment.findById(report.reportedItem).select('content user ad');
        if (comment) {
          reportObj.reportedItemDetails = {
            content: comment.content,
            userId: comment.user,
            adId: comment.ad
          };
        }
      }
      
      return reportObj;
    }));
    
    return res.status(200).json({
      reports: populatedReports,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Błąd podczas pobierania listy zgłoszeń:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania listy zgłoszeń.' });
  }
};

/**
 * Pobiera szczegóły pojedynczego zgłoszenia
 * Retrieves details of a single report
 */
export const getReportById = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    const report = await Report.findById(reportId)
      .populate('reporter', 'email name lastName')
      .populate('assignedTo', 'email name lastName');
    
    if (!report) {
      return res.status(404).json({ message: 'Zgłoszenie nie zostało znalezione.' });
    }
    
    // Pobierz dodatkowe informacje o zgłoszonym elemencie / Get additional info about reported item
    const reportObj = report.toObject();
    
    if (report.reportType === 'ad') {
      const ad = await Ad.findById(report.reportedItem)
        .populate('owner', 'email name lastName');
      
      if (ad) {
        reportObj.reportedItemDetails = {
          title: ad.headline,
          description: ad.description,
          price: ad.price,
          user: ad.owner
        };
      }
    } else if (report.reportType === 'user') {
      const user = await User.findById(report.reportedItem);
      
      if (user) {
        reportObj.reportedItemDetails = {
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt
        };
      }
    } else if (report.reportType === 'comment') {
      const comment = await Comment.findById(report.reportedItem)
        .populate('user', 'email name lastName')
        .populate('ad', 'title');
      
      if (comment) {
        reportObj.reportedItemDetails = {
          content: comment.content,
          user: comment.user,
          ad: comment.ad,
          createdAt: comment.createdAt
        };
      }
    }
    
    return res.status(200).json({ report: reportObj });
  } catch (error) {
    console.error('Błąd podczas pobierania szczegółów zgłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas pobierania szczegółów zgłoszenia.' });
  }
};

/**
 * Aktualizuje status zgłoszenia
 * Updates report status
 */
export const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNote, actionTaken, assignedTo } = req.body;
    
    // Sprawdź czy zgłoszenie istnieje / Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Zgłoszenie nie zostało znalezione.' });
    }
    
    // Aktualizuj dane / Update data
    if (status !== undefined) report.status = status;
    if (adminNote !== undefined) report.adminNote = adminNote;
    if (actionTaken !== undefined) report.actionTaken = actionTaken;
    if (assignedTo !== undefined) report.assignedTo = assignedTo;
    
    // Jeśli status zmieniony na "resolved" lub "rejected", zapisz datę rozwiązania / If status changed to "resolved" or "rejected", save resolution date
    if ((status === 'resolved' || status === 'rejected') && report.resolvedAt === undefined) {
      report.resolvedAt = new Date();
      report.resolvedBy = req.user.userId;
    }
    
    await report.save();
    
    // Jeśli podjęto działanie, wykonaj je / If action taken, execute it
    if (actionTaken && actionTaken !== 'none') {
      await executeAction(report, actionTaken, req.user.userId);
    }
    
    return res.status(200).json({ 
      message: `Status zgłoszenia został zaktualizowany na "${status}".`,
      report
    });
  } catch (error) {
    console.error('Błąd podczas aktualizacji statusu zgłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas aktualizacji statusu zgłoszenia.' });
  }
};

/**
 * Usuwa zgłoszenie
 * Deletes a report
 */
export const deleteReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Sprawdź czy zgłoszenie istnieje / Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Zgłoszenie nie zostało znalezione.' });
    }
    
    await Report.findByIdAndDelete(reportId);
    
    return res.status(200).json({ message: 'Zgłoszenie zostało usunięte.' });
  } catch (error) {
    console.error('Błąd podczas usuwania zgłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas usuwania zgłoszenia.' });
  }
};

/**
 * Rozwiązuje zgłoszenie
 * Resolves a report
 */
export const resolveReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { action, notes } = req.body;
    
    // Sprawdź czy zgłoszenie istnieje / Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ 
        success: false,
        message: 'Zgłoszenie nie zostało znalezione.' 
      });
    }
    
    // Aktualizuj status zgłoszenia / Update report status
    report.status = 'resolved';
    report.resolvedAt = new Date();
    report.resolvedBy = req.user.userId;
    report.adminNote = notes || '';
    report.actionTaken = action || 'none';
    
    await report.save();
    
    // Wykonaj działanie jeśli zostało określone / Execute action if specified
    if (action && action !== 'none') {
      await executeAction(report, action, req.user.userId);
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Zgłoszenie zostało rozwiązane.',
      data: report
    });
  } catch (error) {
    console.error('Błąd podczas rozwiązywania zgłoszenia:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Błąd serwera podczas rozwiązywania zgłoszenia.' 
    });
  }
};

/**
 * Przypisuje zgłoszenie do administratora
 * Assigns a report to an administrator
 */
export const assignReport = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { adminId } = req.body;
    
    // Sprawdź czy zgłoszenie istnieje / Check if report exists
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Zgłoszenie nie zostało znalezione.' });
    }
    
    // Sprawdź czy administrator istnieje / Check if admin exists
    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || !['admin', 'moderator'].includes(admin.role)) {
        return res.status(400).json({ message: 'Nieprawidłowy administrator.' });
      }
    }
    
    // Przypisz zgłoszenie / Assign report
    report.assignedTo = adminId || null;
    report.status = adminId ? 'investigating' : 'pending';
    
    await report.save();
    
    return res.status(200).json({ 
      message: adminId 
        ? `Zgłoszenie zostało przypisane do administratora.` 
        : `Zgłoszenie zostało odprzypisane.`,
      report
    });
  } catch (error) {
    console.error('Błąd podczas przypisywania zgłoszenia:', error);
    return res.status(500).json({ message: 'Błąd serwera podczas przypisywania zgłoszenia.' });
  }
};

/**
 * Wykonuje działanie na podstawie decyzji administratora
 * Executes action based on admin decision
 */
const executeAction = async (report, actionTaken, adminId) => {
  try {
    // Pobierz odpowiedni model w zależności od typu zgłoszenia / Get appropriate model based on report type
    let Model, itemId, userId;
    
    if (report.reportType === 'ad') {
      Model = Ad;
      itemId = report.reportedItem;
      
      const ad = await Ad.findById(itemId);
      if (ad) userId = ad.owner;
    } else if (report.reportType === 'comment') {
      Model = Comment;
      itemId = report.reportedItem;
      
      const comment = await Comment.findById(itemId);
      if (comment) userId = comment.user;
    } else if (report.reportType === 'user') {
      Model = User;
      itemId = report.reportedItem;
      userId = itemId;
    }
    
    // Wykonaj odpowiednie działanie / Execute appropriate action
    switch (actionTaken) {
      case 'warning':
        // Wyślij ostrzeżenie do użytkownika / Send warning to user
        if (userId) {
          await Notification.create({
            user: userId,
            type: 'warning',
            title: 'Ostrzeżenie od administratora',
            message: `Otrzymałeś ostrzeżenie dotyczące treści, która została zgłoszona. Powód: ${report.reason}`,
            data: {
              reportId: report._id,
              reportType: report.reportType,
              reportedItem: report.reportedItem
            }
          });
        }
        break;
        
      case 'content_removed':
        // Usuń treść / Remove content
        if (Model && itemId && report.reportType !== 'user') {
          await Model.findByIdAndDelete(itemId);
          
          // Powiadom użytkownika / Notify user
          if (userId) {
            await Notification.create({
              user: userId,
              type: 'content_removed',
              title: 'Treść została usunięta',
              message: `Twoja treść została usunięta przez administratora. Powód: ${report.reason}`,
              data: {
                reportId: report._id,
                reportType: report.reportType
              }
            });
          }
        }
        break;
        
      case 'account_suspended':
        // Zawieś konto użytkownika / Suspend user account
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            user.status = 'suspended';
            user.suspendedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dni / 7 days
            user.suspendedBy = adminId;
            user.suspensionReason = `Zgłoszenie: ${report.reason}`;
            await user.save();
            
            // Powiadom użytkownika / Notify user
            await Notification.create({
              user: userId,
              type: 'account_suspended',
              title: 'Konto zostało zawieszone',
              message: `Twoje konto zostało tymczasowo zawieszone przez administratora. Powód: ${report.reason}`,
              data: {
                reportId: report._id,
                suspendedUntil: user.suspendedUntil
              }
            });
          }
        }
        break;
        
      case 'account_banned':
        // Zbanuj konto użytkownika / Ban user account
        if (userId) {
          const user = await User.findById(userId);
          if (user) {
            user.status = 'banned';
            user.bannedBy = adminId;
            user.banReason = `Zgłoszenie: ${report.reason}`;
            await user.save();
            
            // Powiadom użytkownika / Notify user
            await Notification.create({
              user: userId,
              type: 'account_banned',
              title: 'Konto zostało zbanowane',
              message: `Twoje konto zostało permanentnie zbanowane przez administratora. Powód: ${report.reason}`,
              data: {
                reportId: report._id
              }
            });
          }
        }
        break;
    }
  } catch (error) {
    console.error('Błąd podczas wykonywania działania:', error);
    throw error;
  }
};
