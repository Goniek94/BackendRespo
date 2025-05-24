import React from 'react';
import { Box, H2, H4, Text, Badge, Card, Table, TableHead, TableBody, TableRow, TableCell } from '@adminjs/design-system';

const Dashboard = () => {
  return (
    <Box>
      <H2>Panel Administratora Marketplace</H2>
      <Text mb="xl">Witaj w panelu administracyjnym. Tutaj możesz zarządzać swoją platformą.</Text>
      
      <Box flex flexDirection="row" flexWrap="wrap">
        <Card title="Statystyki" width={["100%", "100%", "49%"]} as="a" href="/admin/resources/User" mr="md">
          <Text textAlign="center">
            <Badge outline size="lg">Użytkownicy</Badge>
            <H4 mt="default">120</H4>
          </Text>
        </Card>
        
        <Card title="Ogłoszenia" width={["100%", "100%", "49%"]} as="a" href="/admin/resources/Listing">
          <Text textAlign="center">
            <Badge outline size="lg">Ogłoszenia</Badge>
            <H4 mt="default">450</H4>
          </Text>
        </Card>
      </Box>
      
      <Box mt="xl">
        <Card title="Ostatnia aktywność">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Działanie</TableCell>
                <TableCell>Użytkownik</TableCell>
                <TableCell>Data</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Nowe ogłoszenie</TableCell>
                <TableCell>jan.kowalski@example.com</TableCell>
                <TableCell>Dzisiaj, 14:30</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Rejestracja użytkownika</TableCell>
                <TableCell>anna.nowak@example.com</TableCell>
                <TableCell>Dzisiaj, 12:15</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Zmiana statusu ogłoszenia</TableCell>
                <TableCell>admin@marketplace.pl</TableCell>
                <TableCell>Wczoraj, 18:45</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </Box>
      
      <Box mt="xl">
        <Card title="Szybkie akcje">
          <Box flex flexDirection="row" flexWrap="wrap">
            <Box width={["100%", "50%", "25%"]} p="md">
              <a href="/admin/resources/User/actions/new" style={{ textDecoration: 'none' }}>
                <Badge outline size="lg" width="100%" mb="default">Dodaj użytkownika</Badge>
              </a>
            </Box>
            <Box width={["100%", "50%", "25%"]} p="md">
              <a href="/admin/resources/Listing/actions/new" style={{ textDecoration: 'none' }}>
                <Badge outline size="lg" width="100%" mb="default">Dodaj ogłoszenie</Badge>
              </a>
            </Box>
            <Box width={["100%", "50%", "25%"]} p="md">
              <a href="/admin/resources/User" style={{ textDecoration: 'none' }}>
                <Badge outline size="lg" width="100%" mb="default">Lista użytkowników</Badge>
              </a>
            </Box>
            <Box width={["100%", "50%", "25%"]} p="md">
              <a href="/admin/resources/Listing" style={{ textDecoration: 'none' }}>
                <Badge outline size="lg" width="100%" mb="default">Lista ogłoszeń</Badge>
              </a>
            </Box>
          </Box>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard;