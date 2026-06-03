import React from 'react'
import { ThemeProvider } from './src/context/ThemeContext'
import Layout from './src/components/layout'
import './src/styles/global.css';
import 'molstar/lib/mol-plugin-ui/skin/light.scss';

export const wrapRootElement = ({ element }) => (
  <ThemeProvider>{element}</ThemeProvider>
)

export const wrapPageElement = ({ element, props }) => (
  <Layout {...props}>{element}</Layout>
)
